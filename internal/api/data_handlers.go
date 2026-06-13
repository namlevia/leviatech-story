package api

import (
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

	group.Put("/:name", func(c *fiber.Ctx) error {
		oldName := c.Params("name")
		var item services.DataItem
		if err := c.BodyParser(&item); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}
		if err := manager.Update(oldName, item); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "success"})
	})

	group.Delete("/:name", func(c *fiber.Ctx) error {
		name := c.Params("name")
		if err := manager.Delete(name); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "success"})
	})
}

func SetupDataRoutes(app *fiber.App) {
	createDataHandlers(app, "genres", services.GenreManager)
	createDataHandlers(app, "sub_genres", services.SubGenreManager)
	createDataHandlers(app, "styles", services.StyleManager)
	createDataHandlers(app, "tones", services.ToneManager)
}
