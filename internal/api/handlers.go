package api

import (
	"fmt"
	"net/url"
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/namlevia/leviatech-story/internal/core"
	"github.com/namlevia/leviatech-story/internal/services"
	"github.com/namlevia/leviatech-story/internal/utils"
)

func ListProjects(c *fiber.Ctx) error {
	pm := services.NewProjectManager()
	projects, err := pm.ListProjects()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(projects)
}

func GetProject(c *fiber.Ctx) error {
	id := c.Params("id")
	pm := services.NewProjectManager()
	project, err := pm.LoadProject(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}
	return c.JSON(project)
}

func UpdateProject(c *fiber.Ctx) error {
	id := c.Params("id")

	var p core.NovelProject
	if err := c.BodyParser(&p); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	p.ID = id

	pm := services.NewProjectManager()
	existing, err := pm.LoadProject(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	p.CreatedAt = existing.CreatedAt

	if err := pm.SaveProject(&p); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update project"})
	}

	return c.JSON(p)
}

func CreateProject(c *fiber.Ctx) error {
	type Request struct {
		Title            string   `json:"title"`
		Genre            string   `json:"genre"`
		SubGenres        []string `json:"sub_genres"`
		CharacterSetting string   `json:"character_setting"`
		WorldSetting     string   `json:"world_setting"`
		PlotIdea         string   `json:"plot_idea"`
	}

	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	pm := services.NewProjectManager()
	project, err := pm.CreateProject(req.Title, req.Genre, req.SubGenres, req.CharacterSetting, req.WorldSetting, req.PlotIdea)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	if err := pm.SaveProject(project); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save project"})
	}

	// Tự động trích xuất Lorebook ngầm
	go func() {
		gen := services.GetGenerator()
		gen.ExtractAndSaveLore(project.ID, req.CharacterSetting, req.WorldSetting)
	}()

	return c.Status(201).JSON(project)
}

func DeleteProject(c *fiber.Ctx) error {
	id := c.Params("id")
	pm := services.NewProjectManager()
	err := pm.DeleteProject(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success"})
}

func ExportProject(c *fiber.Ctx) error {
	id := c.Params("id")

	type Request struct {
		Format string `json:"format"`
	}
	var req Request
	format := "txt"
	if err := c.BodyParser(&req); err == nil && req.Format != "" {
		format = req.Format
	} else {
		format = c.Query("format", "txt")
	}


	pm := services.NewProjectManager()
	project, err := pm.LoadProject(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	var chapters []utils.ChapterData
	for i, ch := range project.Chapters {
		if ch.Content != "" {
			cleanTitle := utils.StripChapterPrefix(ch.Title)
			titleStr := fmt.Sprintf("Chương %d: %s", i+1, cleanTitle)
			if cleanTitle == "" {
				titleStr = fmt.Sprintf("Chương %d", i+1)
			}
			chapters = append(chapters, utils.ChapterData{
				Title:   titleStr,
				Content: ch.Content,
			})
		}
	}

	if len(chapters) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "No chapters with content found to export"})
	}

	var exportPath string
	switch format {
	case "txt":
		exportPath, err = utils.ExportToTXT(chapters, project.Title)
	case "md", "markdown":
		exportPath, err = utils.ExportToMarkdown(chapters, project.Title)
	case "html":
		exportPath, err = utils.ExportToHTML(chapters, project.Title)
	case "epub":
		exportPath, err = utils.ExportToEPUB(chapters, project.Title)
	default:
		return c.Status(400).JSON(fiber.Map{"error": "Unsupported format"})
	}

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	fileBytes, readErr := os.ReadFile(exportPath)
	if readErr == nil {
		os.Remove(exportPath) // Do not bloat the server
	}

	baseName := filepath.Base(exportPath)
	// URL encode the filename to preserve UTF-8 safely across proxies
	c.Set("X-Filename", url.PathEscape(baseName))
	c.Set("Content-Disposition", `attachment; filename="`+baseName+`"`)
	c.Set("Access-Control-Expose-Headers", "X-Filename, Content-Disposition")

	if format == "epub" {
		c.Set("Content-Type", "application/epub+zip")
	} else if format == "html" {
		c.Set("Content-Type", "text/html")
	} else if format == "md" || format == "markdown" || format == "txt" {
		c.Set("Content-Type", "text/plain")
	}

	return c.Send(fileBytes)
}

func ParseFileEndpoint(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "File is required"})
	}

	// Create temp file
	tempFile := filepath.Join(os.TempDir(), file.Filename)
	if err := c.SaveFile(file, tempFile); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save file"})
	}
	defer os.Remove(tempFile) // clean up

	text, err := utils.ParseFile(tempFile)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"text":    text,
	})
}
