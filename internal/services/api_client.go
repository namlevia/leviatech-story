package services

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/namlevia/leviatech-story/internal/core"
	"github.com/sashabaranov/go-openai"
)

type APIClient struct {
	cache       *ResponseCache
	clients     []ClientInfo
	limiters    map[string]*RateLimiter
	clientIndex int
	mu          sync.Mutex
}

type ClientInfo struct {
	Backend core.Backend
	Client  *openai.Client
}

var (
	apiInstance *APIClient
	apiOnce     sync.Once
)

func GetAPIClient() *APIClient {
	apiOnce.Do(func() {
		apiInstance = &APIClient{
			cache:    NewResponseCache(100),
			limiters: make(map[string]*RateLimiter),
		}
		apiInstance.InitClients()
	})
	return apiInstance
}

func (a *APIClient) InitClients() {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.clients = []ClientInfo{}
	config := core.GetConfig()
	backends := config.GetEnabledBackends()

	for _, b := range backends {
		cfg := openai.DefaultConfig(b.APIKey)
		cfg.BaseURL = strings.TrimRight(b.BaseURL, "/")
		client := openai.NewClientWithConfig(cfg)

		a.clients = append(a.clients, ClientInfo{Backend: b, Client: client})

		limitKey := fmt.Sprintf("%s_%s", b.Name, b.Model)
		if _, exists := a.limiters[limitKey]; !exists {
			a.limiters[limitKey] = NewRateLimiter(10, 60)
		}
		log.Printf("Backend init success: %s", b.Name)
	}
}

func (a *APIClient) getNextClient(retryCount int) *ClientInfo {
	a.mu.Lock()
	defer a.mu.Unlock()

	if len(a.clients) == 0 {
		return nil
	}

	if retryCount == 0 {
		for _, c := range a.clients {
			if c.Backend.IsDefault {
				return &c
			}
		}
	}

	idx := a.clientIndex
	a.clientIndex = (idx + 1) % len(a.clients)
	return &a.clients[idx]
}

func (a *APIClient) stripReasoning(text string) string {
	if text == "" {
		return ""
	}
	re1 := regexp.MustCompile(`(?is)<(?:thought|reasoning)>.*?</(?:thought|reasoning)>`)
	text = re1.ReplaceAllString(text, "")
	return strings.TrimSpace(text)
}

func (a *APIClient) Generate(messages []openai.ChatCompletionMessage, useCache bool, maxRetries int, backoff float64) (bool, string) {
	if len(messages) == 0 {
		return false, "Invalid messages"
	}

	baseWait := 1.0
	for retry := 0; retry < maxRetries; retry++ {
		clientInfo := a.getNextClient(retry)
		if clientInfo == nil {
			return false, "No active backend clients"
		}

		backend := clientInfo.Backend
		client := clientInfo.Client
		limitKey := fmt.Sprintf("%s_%s", backend.Name, backend.Model)

		if useCache && backend.Model != "" {
			if cached := a.cache.Get(messages, backend.Model); cached != nil {
				return true, *cached
			}
		}

		a.mu.Lock()
		limiter, ok := a.limiters[limitKey]
		a.mu.Unlock()
		if ok {
			limiter.Acquire(1, true)
		}

		genCfg := core.GetConfig().Generation

		req := openai.ChatCompletionRequest{
			Model:       backend.Model,
			Messages:    messages,
			Temperature: float32(genCfg.Temperature),
			TopP:        float32(genCfg.TopP),
			MaxTokens:   genCfg.MaxTokens,
		}

		timeout := backend.Timeout
		if timeout <= 0 {
			timeout = 60
		}
		ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeout)*time.Second)
		resp, err := client.CreateChatCompletion(ctx, req)
		cancel()

		if err != nil {
			waitTime := baseWait * float64(int(backoff)<<retry)
			log.Printf("API error (%s): %v, wait %.2fs", backend.Name, err, waitTime)
			time.Sleep(time.Duration(waitTime * float64(time.Second)))
			continue
		}

		if len(resp.Choices) > 0 {
			content := resp.Choices[0].Message.Content
			content = a.stripReasoning(content)

			if len(content) >= 10 {
				if useCache {
					a.cache.Set(messages, backend.Model, content, 3600)
				}
				return true, content
			}
		}
		
		log.Printf("Invalid/short content from %s", backend.Name)
	}

	return false, "Retry failed"
}

type StreamChunk struct {
	Success bool   `json:"success"`
	Content string `json:"content"`
	Done    bool   `json:"done"`
	Clear   bool   `json:"clear,omitempty"`
}

func (a *APIClient) GenerateStream(messages []openai.ChatCompletionMessage, ch chan<- StreamChunk) {
	defer close(ch)

	if len(messages) == 0 {
		ch <- StreamChunk{Success: false, Content: "Invalid messages", Done: true}
		return
	}

	maxRetries := 3
	baseWait := 1.0

	for retry := 0; retry < maxRetries; retry++ {
		clientInfo := a.getNextClient(retry)
		if clientInfo == nil {
			ch <- StreamChunk{Success: false, Content: "No active backend clients", Done: true}
			return
		}

		backend := clientInfo.Backend
		client := clientInfo.Client

		genCfg := core.GetConfig().Generation

		req := openai.ChatCompletionRequest{
			Model:       backend.Model,
			Messages:    messages,
			Temperature: float32(genCfg.Temperature),
			TopP:        float32(genCfg.TopP),
			MaxTokens:   genCfg.MaxTokens,
			Stream:      true,
		}

		timeout := backend.Timeout
		if timeout <= 0 {
			timeout = 60
		}
		ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeout)*time.Second*5) // longer timeout for streaming
		defer cancel()
		
		stream, err := client.CreateChatCompletionStream(ctx, req)
		if err != nil {
			waitTime := baseWait * float64(int(2)<<retry)
			log.Printf("API error (%s): %v, wait %.2fs", backend.Name, err, waitTime)
			time.Sleep(time.Duration(waitTime * float64(time.Second)))
			continue
		}

		hasContent := false
		for {
			response, err := stream.Recv()
			if err != nil {
				// EOF or error
				stream.Close()
				if !hasContent {
					// if no content received at all, maybe retry
					break 
				}
				ch <- StreamChunk{Success: true, Content: "", Done: true}
				return
			}

			if len(response.Choices) > 0 {
				delta := response.Choices[0].Delta.Content
				log.Printf("Stream received: Delta=%q, FinishReason=%q", delta, response.Choices[0].FinishReason)
				if delta != "" {
					hasContent = true
					ch <- StreamChunk{Success: true, Content: delta, Done: false}
				}
			}
		}
		
		if hasContent {
			// If we broke out due to EOF and had content, we already returned
			return
		}
	}

	ch <- StreamChunk{Success: false, Content: "Retry failed in streaming", Done: true}
}
