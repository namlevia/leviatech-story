package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/namlevia/leviatech-story/internal/api"
	"github.com/namlevia/leviatech-story/internal/core"
	"github.com/namlevia/leviatech-story/internal/services"
)

func main() {
	core.InitLogger()
	log.Println("Starting LeviaTech Story Go API Server...")

	// Init DB and Config
	core.GetDB()
	core.GetConfig()
	
	// Init API Client
	services.GetAPIClient()

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	// Setup API routes
	api.SetupRoutes(app)

	// Serve static frontend files
	app.Static("/", "./frontend/out")
	
	// SPA Fallback: Redirect all other non-API routes to index.html
	app.Use(func(c *fiber.Ctx) error {
		// If the request starts with /api, it means an API route wasn't found, so return 404 JSON
		if len(c.Path()) >= 4 && c.Path()[:4] == "/api" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "API Route Not Found",
			})
		}
		// Otherwise, return the frontend index.html
		return c.SendFile("./frontend/out/index.html")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "1997"
	}

	log.Printf("Server listening on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Server startup failed: %v", err)
	}
}
