package api

import (
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/namlevia/leviatech-story/internal/utils"
	"github.com/namlevia/leviatech-story/internal/services"
)

// Lorebook Handlers
func GetLoreEntriesEndpoint(c *fiber.Ctx) error {
	projectID := c.Params("project_id")
	entries, errMsg := services.GetLoreEntries(projectID)
	if errMsg != "" {
		return c.Status(500).JSON(fiber.Map{"error": errMsg})
	}
	if entries == nil {
		entries = []services.LoreEntry{}
	}
	return c.JSON(entries)
}

func CreateLoreEntryEndpoint(c *fiber.Ctx) error {
	projectID := c.Params("project_id")
	type Request struct {
		Name     string `json:"name"`
		Category string `json:"category"`
		Keywords string `json:"keywords"`
		Content  string `json:"content"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	entry, errMsg := services.CreateLoreEntry(projectID, req.Name, req.Category, req.Keywords, req.Content)
	if errMsg != "" {
		return c.Status(500).JSON(fiber.Map{"error": errMsg})
	}
	return c.Status(201).JSON(entry)
}

func UpdateLoreEntryEndpoint(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	type Request struct {
		Name     string `json:"name"`
		Category string `json:"category"`
		Keywords string `json:"keywords"`
		Content  string `json:"content"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	entry, errMsg := services.UpdateLoreEntry(id, req.Name, req.Category, req.Keywords, req.Content)
	if errMsg != "" {
		return c.Status(500).JSON(fiber.Map{"error": errMsg})
	}
	return c.JSON(entry)
}

func DeleteLoreEntryEndpoint(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	errMsg := services.DeleteLoreEntry(id)
	if errMsg != "" {
		return c.Status(500).JSON(fiber.Map{"error": errMsg})
	}
	return c.JSON(fiber.Map{"success": true})
}

// Prompts implementation
func GetPromptsEndpoint(c *fiber.Ctx) error {
	prompts := make(map[string]map[string]string)
	
	// Read custom prompts from data/prompts.json if it exists
	promptsPath := filepath.Join("data", "prompts.json")
	if data, err := os.ReadFile(promptsPath); err == nil {
		if err := json.Unmarshal(data, &prompts); err != nil {
			var oldFormat map[string]string
			if json.Unmarshal(data, &oldFormat) == nil {
				prompts["Mặc định"] = oldFormat
			}
		}
	}

	// Ensure "Mặc định" exists
	if prompts["Mặc định"] == nil {
		prompts["Mặc định"] = make(map[string]string)
	}

	// Define required keys
	keys := []string{"chapter_system", "continue_system", "outline_system", "polish_system", "suggest_style_tone_system", "suggest_system", "suggest_title_system", "suggest_char_system", "suggest_world_system", "suggest_plot_system"}
	
	for _, key := range keys {
		if prompts["Mặc định"][key] == "" {
			// Try to load from messages.json
			val := utils.T("prompts." + key)
			if val == "prompts."+key {
				// Fallbacks if missing in messages.json
				switch key {
				case "continue_system":
					val = utils.T("prompts.chapter_system")
				case "polish_system":
					val = utils.T("prompts.rewrite_system")
				default:
					val = ""
				}
			}
			prompts["Mặc định"][key] = val
		}
	}

	return c.JSON(prompts)
}

func UpdatePromptsEndpoint(c *fiber.Ctx) error {
	var prompts map[string]map[string]string
	if err := c.BodyParser(&prompts); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	os.MkdirAll("data", 0755)
	promptsPath := filepath.Join("data", "prompts.json")
	data, err := json.MarshalIndent(prompts, "", "  ")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to encode prompts"})
	}

	if err := os.WriteFile(promptsPath, data, 0644); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save prompts"})
	}
	
	// Reload the global i18n customized prompts
	utils.InitI18n()

	return c.JSON(fiber.Map{"success": true})
}
