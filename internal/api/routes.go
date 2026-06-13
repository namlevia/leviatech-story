package api

import (
	"github.com/gofiber/fiber/v2"
	"github.com/namlevia/leviatech-story/internal/core"
)

func SetupRoutes(app *fiber.App) {
	api := app.Group("/api")

	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"version": core.GetConfig().Version,
		})
	})

	// Lorebook APIs
	api.Get("/projects/:project_id/lore", GetLoreEntriesEndpoint)
	api.Post("/projects/:project_id/lore", CreateLoreEntryEndpoint)
	api.Put("/lore/:id", UpdateLoreEntryEndpoint)
	api.Delete("/lore/:id", DeleteLoreEntryEndpoint)

	// Projects
	api.Get("/projects", ListProjects)
	api.Post("/projects", CreateProject)
	api.Get("/projects/:id", GetProject)
	api.Put("/projects/:id", UpdateProject)
	api.Delete("/projects/:id", DeleteProject)
	api.Post("/projects/:id/export", ExportProject)

	// Config / Backends
	api.Get("/config/generation", GetGenerationConfig)
	api.Put("/config/generation", UpdateGenerationConfig)
	api.Get("/config/backends", ListBackends)
	api.Post("/config/backends", AddBackend)
	api.Put("/config/backends/:name", UpdateBackend)
	api.Delete("/config/backends/:name", DeleteBackend)
	api.Post("/config/backends/:name/toggle", ToggleBackend)
	api.Post("/config/backends/:name/default", SetDefaultBackend)
	api.Get("/config/backends/:name/test", TestBackend)
	api.Post("/config/backends/test-connection", TestConnection)
	api.Post("/config/backends/fetch-models", FetchModels)
	api.Get("/logs", GetLogs)

	// Prompts
	api.Get("/config/prompts", GetPromptsEndpoint)
	api.Put("/config/prompts", UpdatePromptsEndpoint)

	// Data Routes
	SetupDataRoutes(app)

	// Parse Endpoints
	parse := api.Group("/parser")
	parse.Post("/upload", ParseFileEndpoint)

	// Task Management
	api.Get("/tasks", func(c *fiber.Ctx) error {
		return c.JSON([]interface{}{})
	})
	api.Delete("/tasks/:id", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"success": true})
	})

	// Generator Endpoints
	gen := api.Group("/generator")
	gen.Post("/parse-outline", ParseOutlineEndpoint)
	gen.Post("/outline", GenerateOutlineEndpoint)
	gen.Post("/suggest-title", SuggestTitleEndpoint)
	gen.Post("/suggest-content", SuggestContentEndpoint)
	gen.Post("/suggest-style-tone", SuggestStyleToneEndpoint)
	gen.Post("/chapter/stream", GenerateChapterStreamEndpoint)
	gen.Post("/summary", GenerateSummaryEndpoint)
	gen.Post("/rewrite", RewriteParagraphEndpoint)
	gen.Post("/polish", PolishTextEndpoint)
	gen.Post("/continue/stream", ContinueWritingStreamEndpoint)

	// Cache Endpoints
	cache := gen.Group("/cache")
	cache.Get("/generation/:project_id", GetGenerationCacheEndpoint)
	cache.Post("/generation/:project_id", SaveGenerationCacheEndpoint)
	cache.Delete("/generation/:project_id", ClearGenerationCacheEndpoint)
	
	cache.Post("/summary", SaveChapterSummaryEndpoint)
	cache.Get("/summary/:project_id", GetChapterSummariesEndpoint)
}
