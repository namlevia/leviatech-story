package api

import (
	"log"
	"net/url"

	"github.com/gofiber/fiber/v2"
	"github.com/namlevia/leviatech-story/internal/services"
)

func createDataHandlers(app *fiber.App, groupName string, manager *services.DataManager) {
	group := app.Group("/api/data/" + groupName)

	group.Get("/", func(c *fiber.Ctx) error {
		items, err := manager.Load()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(items)
	})

	group.Post("/", func(c *fiber.Ctx) error {
		var item services.DataItem
		if err := c.BodyParser(&item); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}
		if err := manager.Add(item); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "success"})
	})

	putHandler := func(c *fiber.Ctx) error {
		rawName := c.Params("*")
		oldName, err := url.PathUnescape(rawName)
		if err != nil {
			oldName = rawName
		}
		log.Printf("PUT handler: rawName='%s', oldName='%s'", rawName, oldName)
		
		var item services.DataItem
		if err := c.BodyParser(&item); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}
		if err := manager.Update(oldName, item); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "success"})
	}
	group.Put("/*", putHandler)

	deleteHandler := func(c *fiber.Ctx) error {
		rawName := c.Params("*")
		name, err := url.PathUnescape(rawName)
		if err != nil {
			name = rawName
		}
		log.Printf("DELETE handler: rawName='%s', name='%s'", rawName, name)
		
		if err := manager.Delete(name); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "success"})
	}
	group.Delete("/*", deleteHandler)

	postDeleteHandler := func(c *fiber.Ctx) error {
		var req struct {
			Name string `json:"name"`
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}
		log.Printf("POST DELETE handler: name='%s'", req.Name)
		if err := manager.Delete(req.Name); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "success"})
	}
	group.Post("/delete", postDeleteHandler)
}

func SetupDataRoutes(app *fiber.App) {
	createDataHandlers(app, "genres", services.GenreManager)
	createDataHandlers(app, "sub_genres", services.SubGenreManager)
	createDataHandlers(app, "styles", services.StyleManager)
	createDataHandlers(app, "tones", services.ToneManager)
	createDataHandlers(app, "pov", services.PovManager)
	createDataHandlers(app, "pronouns", services.PronounManager)
	createDataHandlers(app, "story_structures", services.StoryStructureManager)
}
