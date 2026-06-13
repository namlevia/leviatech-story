package api

import (
	"context"
	"io"
	"net/url"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/namlevia/leviatech-story/internal/core"
	"github.com/namlevia/leviatech-story/internal/services"
	"github.com/sashabaranov/go-openai"
)

func ListBackends(c *fiber.Ctx) error {
	cfg := core.GetConfig()
	cfg.RLock()
	defer cfg.RUnlock()
	return c.JSON(fiber.Map{
		"success": true,
		"data":    cfg.Backends,
	})
}

func GetGenerationConfig(c *fiber.Ctx) error {
	cfg := core.GetConfig()
	cfg.RLock()
	defer cfg.RUnlock()
	return c.JSON(cfg.Generation)
}

func UpdateGenerationConfig(c *fiber.Ctx) error {
	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request"})
	}
	
	if err := core.GetConfig().UpdateGenerationConfig(updates); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Generation config updated"})
}

func AddBackend(c *fiber.Ctx) error {
	var b core.Backend
	if err := c.BodyParser(&b); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request"})
	}
	
	if b.Timeout <= 0 {
		b.Timeout = 60
	}
	if err := core.GetConfig().AddBackend(b); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	services.GetAPIClient().InitClients()
	return c.JSON(fiber.Map{"success": true, "message": "Backend added", "backend": b})
}

func UpdateBackend(c *fiber.Ctx) error {
	name, _ := url.PathUnescape(c.Params("name"))
	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request"})
	}
	if v, ok := updates["timeout"].(float64); ok && v <= 0 {
		updates["timeout"] = 60
	}
	
	if err := core.GetConfig().UpdateBackend(name, updates); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	services.GetAPIClient().InitClients()
	return c.JSON(fiber.Map{"success": true, "message": "Backend updated"})
}

func DeleteBackend(c *fiber.Ctx) error {
	name, _ := url.PathUnescape(c.Params("name"))
	if err := core.GetConfig().DeleteBackend(name); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	services.GetAPIClient().InitClients()
	return c.JSON(fiber.Map{"success": true, "message": "Backend deleted"})
}

func ToggleBackend(c *fiber.Ctx) error {
	name, _ := url.PathUnescape(c.Params("name"))
	
	cfg := core.GetConfig()
	cfg.Lock()
	
	var found bool
	for i, b := range cfg.Backends {
		if b.Name == name {
			cfg.Backends[i].Enabled = !cfg.Backends[i].Enabled
			found = true
			break
		}
	}
	
	if !found {
		cfg.Unlock()
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Backend not found"})
	}
	
	if err := cfg.Save(); err != nil {
		cfg.Unlock()
		return c.Status(500).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	cfg.Unlock()

	services.GetAPIClient().InitClients()
	return c.JSON(fiber.Map{"success": true, "message": "Backend toggled"})
}

func SetDefaultBackend(c *fiber.Ctx) error {
	name, _ := url.PathUnescape(c.Params("name"))
	if err := core.GetConfig().SetDefaultBackend(name); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	services.GetAPIClient().InitClients()
	return c.JSON(fiber.Map{"success": true, "message": "Default backend set"})
}

func TestBackend(c *fiber.Ctx) error {
	name, _ := url.PathUnescape(c.Params("name"))
	cfg := core.GetConfig()
	cfg.RLock()
	var backend core.Backend
	var found bool
	for _, b := range cfg.Backends {
		if b.Name == name {
			backend = b
			found = true
			break
		}
	}
	cfg.RUnlock()

	if !found {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Backend not found"})
	}

	oCfg := openai.DefaultConfig(backend.APIKey)
	oCfg.BaseURL = backend.BaseURL
	client := openai.NewClientWithConfig(oCfg)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := client.ListModels(ctx)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Connection successful"})
}

func TestConnection(c *fiber.Ctx) error {
	var req struct {
		Type    string `json:"type"`
		BaseURL string `json:"base_url"`
		APIKey  string `json:"api_key"`
		Model   string `json:"model"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request"})
	}

	oCfg := openai.DefaultConfig(req.APIKey)
	if req.BaseURL != "" {
		oCfg.BaseURL = req.BaseURL
	}
	client := openai.NewClientWithConfig(oCfg)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model: req.Model,
		Messages: []openai.ChatCompletionMessage{
			{Role: "user", Content: "hi"},
		},
		MaxTokens: 5,
	})

	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Kết nối và test Model thành công!"})
}

func FetchModels(c *fiber.Ctx) error {
	var req struct {
		Type    string `json:"type"`
		BaseURL string `json:"base_url"`
		APIKey  string `json:"api_key"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request"})
	}

	if req.Type == "anthropic" {
		return c.JSON(fiber.Map{
			"success": true,
			"data":    []string{"claude-3-5-sonnet-20240620", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"},
		})
	}

	oCfg := openai.DefaultConfig(req.APIKey)
	if req.BaseURL != "" {
		oCfg.BaseURL = req.BaseURL
	}
	client := openai.NewClientWithConfig(oCfg)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	models, err := client.ListModels(ctx)
	if err != nil {
		// Fallback for known providers if fetching fails
		if req.Type == "gemini" {
			return c.JSON(fiber.Map{"success": true, "data": []string{"gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"}})
		}
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	var modelList []string
	for _, m := range models.Models {
		modelList = append(modelList, m.ID)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    modelList,
	})
}

func GetLogs(c *fiber.Ctx) error {
	logPath := "logs/leviatech_story.log"
	
	// Read last 1000 lines (or tail of the file)
	// For simplicity, we just read the whole file if it's small or the last 100kb
	info, err := os.Stat(logPath)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Log file not found"})
	}

	file, err := os.Open(logPath)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Cannot open log file"})
	}
	defer file.Close()

	var size int64 = 50 * 1024 // 50KB max
	if info.Size() < size {
		size = info.Size()
	}

	buf := make([]byte, size)
	_, err = file.ReadAt(buf, info.Size()-size)
	if err != nil && err != io.EOF {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Cannot read log file"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    string(buf),
	})
}
