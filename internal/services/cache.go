package services

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/namlevia/leviatech-story/internal/core"
	"github.com/sashabaranov/go-openai"
)

type CacheEntry struct {
	Key       string
	Value     string
	Timestamp time.Time
	TTL       int
}

type ResponseCache struct {
	cache   map[string]CacheEntry
	maxSize int
	mu      sync.Mutex
}

func NewResponseCache(maxSize int) *ResponseCache {
	return &ResponseCache{
		cache:   make(map[string]CacheEntry),
		maxSize: maxSize,
	}
}

func (c *ResponseCache) generateKey(messages []openai.ChatCompletionMessage, model string) string {
	b, _ := json.Marshal(messages)
	hash := md5.Sum([]byte(string(b) + model))
	return hex.EncodeToString(hash[:])
}

func (c *ResponseCache) Get(messages []openai.ChatCompletionMessage, model string) *string {
	key := c.generateKey(messages, model)
	c.mu.Lock()
	defer c.mu.Unlock()

	if entry, exists := c.cache[key]; exists {
		if time.Since(entry.Timestamp).Seconds() < float64(entry.TTL) {
			return &entry.Value
		}
		delete(c.cache, key)
	}

	db := core.GetDB()
	var val string
	var ts string
	var ttl int
	err := db.QueryRow("SELECT value, timestamp, ttl FROM response_cache WHERE key = ?", key).Scan(&val, &ts, &ttl)
	if err == nil {
		parsedTs, _ := time.Parse(time.RFC3339, ts)
		if time.Since(parsedTs).Seconds() < float64(ttl) {
			c.cache[key] = CacheEntry{Key: key, Value: val, Timestamp: parsedTs, TTL: ttl}
			return &val
		}
	}
	return nil
}

func (c *ResponseCache) Set(messages []openai.ChatCompletionMessage, model string, value string, ttl int) {
	key := c.generateKey(messages, model)
	now := time.Now()

	c.mu.Lock()
	if len(c.cache) >= c.maxSize {
		for k := range c.cache {
			delete(c.cache, k)
			break
		}
	}
	c.cache[key] = CacheEntry{Key: key, Value: value, Timestamp: now, TTL: ttl}
	c.mu.Unlock()

	go func() {
		db := core.GetDB()
		_, err := db.Exec("INSERT OR REPLACE INTO response_cache (key, value, timestamp, ttl) VALUES (?, ?, ?, ?)",
			key, value, now.Format(time.RFC3339), ttl)
		if err != nil {
			log.Println("Failed to save cache to DB:", err)
		}
	}()
}
