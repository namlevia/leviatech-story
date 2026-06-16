package api

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"bufio"

	"github.com/gofiber/fiber/v2"
	"github.com/namlevia/leviatech-story/internal/core"
	"github.com/namlevia/leviatech-story/internal/services"
	"github.com/valyala/fasthttp"
)

// Outline Parsing endpoint
func ParseOutlineEndpoint(c *fiber.Ctx) error {
	type Request struct {
		OutlineText string `json:"outline_text"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	chapters, msg := services.ParseOutline(req.OutlineText)
	if chapters == nil {
		return c.Status(400).JSON(fiber.Map{"error": msg})
	}
	return c.JSON(fiber.Map{"chapters": chapters, "message": msg})
}

func SuggestVolumesEndpoint(c *fiber.Ctx) error {
	type Request struct {
		Title               string   `json:"title"`
		Genre               string   `json:"genre"`
		SubGenres           []string `json:"sub_genres"`
		CharacterSetting    string   `json:"character_setting"`
		WorldSetting        string   `json:"world_setting"`
		PlotIdea            string   `json:"plot_idea"`
		TargetVolumes       int      `json:"target_volumes"`
		CustomOutlinePrompt string   `json:"custom_outline_prompt"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.TargetVolumes <= 0 {
		req.TargetVolumes = 3 // default
	}

	gen := services.GetGenerator()
	content, msg := gen.SuggestVolumes(req.Title, req.Genre, req.SubGenres, req.CharacterSetting, req.WorldSetting, req.PlotIdea, req.TargetVolumes, req.CustomOutlinePrompt)
	if content == "" {
		return c.Status(500).JSON(fiber.Map{"error": msg})
	}

	var volumes []interface{}
	if err := json.Unmarshal([]byte(content), &volumes); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to parse JSON response from AI: " + err.Error() + "\nRaw content: " + content})
	}

	return c.JSON(fiber.Map{"volumes": volumes})
}

// Generate Outline Endpoint
func GenerateOutlineEndpoint(c *fiber.Ctx) error {
	type Request struct {
		Title               string   `json:"title"`
		Genre               string   `json:"genre"`
		SubGenres           []string `json:"sub_genres"`
		Pov                 string   `json:"pov"`
		Pronouns            string   `json:"pronouns"`
		TotalChapters       int      `json:"total_chapters"`
		CharacterSetting    string   `json:"character_setting"`
		WorldSetting        string   `json:"world_setting"`
		PlotIdea            string   `json:"plot_idea"`
		CustomOutlinePrompt string   `json:"custom_outline_prompt"`
		StartChapter        int      `json:"start_chapter"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	gen := services.GetGenerator()
	outline, msg := gen.GenerateOutline(
		req.Title, req.Genre, req.SubGenres, req.Pov, req.Pronouns, req.TotalChapters, req.StartChapter,
		req.CharacterSetting, req.WorldSetting, req.PlotIdea, req.CustomOutlinePrompt,
	)

	if outline == "" {
		return c.Status(500).JSON(fiber.Map{"error": msg})
	}

	return c.JSON(fiber.Map{"outline": outline, "message": msg})
}

// Append Outline Endpoint
func AppendOutlineEndpoint(c *fiber.Ctx) error {
	projectId := c.Params("id")
	if projectId == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Project ID required"})
	}

	type Request struct {
		TotalChapters       int    `json:"total_chapters"`
		CustomOutlinePrompt string `json:"custom_outline_prompt"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	pm := services.NewProjectManager()
	project, err := pm.LoadProject(projectId)
	if err != nil || project == nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	startChapter := 1
	if len(project.Chapters) > 0 {
		startChapter = project.Chapters[len(project.Chapters)-1].Num + 1
	}

	gen := services.GetGenerator()
	outlineStr, msg := gen.GenerateOutline(
		project.Title, project.Genre, project.SubGenres, project.Pov, project.Pronouns, req.TotalChapters, startChapter,
		project.CharacterSetting, project.WorldSetting, project.PlotIdea, req.CustomOutlinePrompt,
	)

	if outlineStr == "" {
		return c.Status(500).JSON(fiber.Map{"error": msg})
	}

	var newChapters []core.Chapter
	if err := json.Unmarshal([]byte(outlineStr), &newChapters); err != nil {
		// Attempt to extract json block if there is markdown wrapper
		startIdx := strings.Index(outlineStr, "[")
		endIdx := strings.LastIndex(outlineStr, "]")
		if startIdx != -1 && endIdx != -1 && endIdx > startIdx {
			jsonBlock := outlineStr[startIdx : endIdx+1]
			if err2 := json.Unmarshal([]byte(jsonBlock), &newChapters); err2 != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to parse AI output: " + err2.Error()})
			}
		} else {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to parse AI output: " + err.Error()})
		}
	}

	maxNum := 0
	for _, ch := range project.Chapters {
		if ch.Num > maxNum {
			maxNum = ch.Num
		}
	}

	for i := range newChapters {
		maxNum++
		newChapters[i].Num = maxNum
		project.Chapters = append(project.Chapters, newChapters[i])
	}

	if err := pm.SaveProject(project); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save project"})
	}

	return c.JSON(fiber.Map{"chapters": project.Chapters, "message": "Thêm dàn ý thành công"})
}

// Suggest Title Endpoint
func SuggestTitleEndpoint(c *fiber.Ctx) error {
	type Request struct {
		Genre        string   `json:"genre"`
		SubGenres    []string `json:"sub_genres"`
		Style        string   `json:"style"`
		Tone         string   `json:"tone"`
		CustomPrompt string   `json:"custom_prompt"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	gen := services.GetGenerator()
	titles, msg := gen.SuggestTitle(req.Genre, req.SubGenres, req.Style, req.Tone, req.CustomPrompt)
	if titles == "" {
		return c.Status(500).JSON(fiber.Map{"error": msg})
	}
	return c.JSON(fiber.Map{"titles": titles, "message": msg})
}

// Suggest Content Endpoint
func SuggestContentEndpoint(c *fiber.Ctx) error {
	type Request struct {
		ContentType      string   `json:"content_type"`
		Title            string   `json:"title"`
		Genre            string   `json:"genre"`
		SubGenres        []string `json:"sub_genres"`
		Style            string   `json:"style"`
		Tone             string   `json:"tone"`
		CharacterSetting string   `json:"character_setting"`
		WorldSetting     string   `json:"world_setting"`
		CustomPrompt     string   `json:"custom_prompt"`
		NumMain          int      `json:"num_main_chars"`
		NumSub           int      `json:"num_sub_chars"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	gen := services.GetGenerator()
	content, msg := gen.SuggestContent(req.ContentType, req.Title, req.Genre, req.SubGenres, req.Style, req.Tone, req.CharacterSetting, req.WorldSetting, req.CustomPrompt, req.NumMain, req.NumSub)
	if content == "" {
		return c.Status(500).JSON(fiber.Map{"error": msg})
	}
	return c.JSON(fiber.Map{"content": content, "message": msg})
}

// Suggest Style and Tone Endpoint
func SuggestStyleToneEndpoint(c *fiber.Ctx) error {
	type Request struct {
		Genre     string   `json:"genre"`
		SubGenres []string `json:"sub_genres"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	gen := services.GetGenerator()
	style, tone, msg := gen.SuggestStyleTone(req.Genre, req.SubGenres)
	if style == "" && tone == "" {
		return c.Status(500).JSON(fiber.Map{"error": msg})
	}
	return c.JSON(fiber.Map{"style": style, "tone": tone, "message": msg})
}

func streamSSE(c *fiber.Ctx, streamChan <-chan services.StreamChunk) error {
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("X-Accel-Buffering", "no")
	c.Set("Access-Control-Allow-Origin", "*")

	c.Context().SetBodyStreamWriter(fasthttp.StreamWriter(func(w *bufio.Writer) {
		for chunk := range streamChan {
			b, err := json.Marshal(chunk)
			if err != nil {
				log.Println("Error marshalling chunk:", err)
				continue
			}
			fmt.Fprintf(w, "data: %s\n\n", string(b))
			w.Flush()
		}
		fmt.Fprintf(w, "event: close\ndata: {}\n\n")
		w.Flush()
	}))

	return nil
}

// Generate Chapter Streaming Endpoint
func GenerateChapterStreamEndpoint(c *fiber.Ctx) error {
	type Request struct {
		ProjectID          string   `json:"project_id"`
		ChapterNum         int      `json:"chapter_num"`
		ChapterTitle       string   `json:"chapter_title"`
		ChapterDesc        string   `json:"chapter_desc"`
		NovelTitle         string   `json:"novel_title"`
		CharacterSetting   string   `json:"character_setting"`
		WorldSetting       string   `json:"world_setting"`
		PlotIdea           string   `json:"plot_idea"`
		Genre              string   `json:"genre"`
		SubGenres          []string `json:"sub_genres"`
		Pov                string   `json:"pov"`
		Pronouns           string   `json:"pronouns"`
		PreviousContent    string   `json:"previous_content"`
		ContextSummary     string   `json:"context_summary"`
		CustomPrompt       string   `json:"custom_prompt"`
		UseReflection      bool     `json:"use_reflection"`
		ChapterTargetWords int      `json:"chapter_target_words"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	streamChan := make(chan services.StreamChunk)
	gen := services.GetGenerator()

	go gen.GenerateChapterStream(
		req.ProjectID, req.ChapterNum, req.ChapterTitle, req.ChapterDesc, req.NovelTitle,
		req.CharacterSetting, req.WorldSetting, req.PlotIdea, req.Genre, req.SubGenres, req.Pov, req.Pronouns,
		req.PreviousContent, req.ContextSummary, req.CustomPrompt, req.UseReflection, req.ChapterTargetWords,
		streamChan,
	)

	return streamSSE(c, streamChan)
}

func GenerateSummaryEndpoint(c *fiber.Ctx) error {
	type Request struct {
		ChapterTitle   string `json:"chapter_title"`
		ChapterContent string `json:"chapter_content"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	gen := services.GetGenerator()
	summary, msg := gen.GenerateChapterSummary(req.ChapterContent, req.ChapterTitle)
	if summary == "" {
		return c.Status(500).JSON(fiber.Map{"error": msg})
	}
	return c.JSON(fiber.Map{"summary": summary, "message": msg})
}

func RewriteParagraphEndpoint(c *fiber.Ctx) error {
	type Request struct {
		Text          string `json:"text"`
		StyleTemplate string `json:"style_template"`
		UseReflection bool   `json:"use_reflection"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	gen := services.GetGenerator()
	content, msg := gen.RewriteParagraph(req.Text, req.StyleTemplate, req.UseReflection)
	if content == "" {
		return c.Status(500).JSON(fiber.Map{"error": msg})
	}
	return c.JSON(fiber.Map{"content": content, "message": msg})
}

func PolishTextEndpoint(c *fiber.Ctx) error {
	type Request struct {
		Text               string `json:"text"`
		PolishType         string `json:"polish_type"`
		CustomRequirements string `json:"custom_requirements"`
		UseReflection      bool   `json:"use_reflection"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	gen := services.GetGenerator()
	content, msg := gen.PolishText(req.Text, req.PolishType, req.CustomRequirements, req.UseReflection)
	if content == "" {
		return c.Status(500).JSON(fiber.Map{"error": msg})
	}
	return c.JSON(fiber.Map{"content": content, "message": msg})
}

func ContinueWritingStreamEndpoint(c *fiber.Ctx) error {
	type Request struct {
		NovelTitle       string `json:"novel_title"`
		CharacterSetting string `json:"character_setting"`
		WorldSetting     string `json:"world_setting"`
		PlotIdea         string   `json:"plot_idea"`
		Genre            string   `json:"genre"`
		SubGenres        []string `json:"sub_genres"`
		Pov              string   `json:"pov"`
		Pronouns         string   `json:"pronouns"`
		ExistingContent  string   `json:"existing_content"`
		CustomPrompt     string   `json:"custom_prompt"`
		UseReflection    bool     `json:"use_reflection"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	targetWords := core.GetConfig().Generation.ChapterTargetWords
	streamChan := make(chan services.StreamChunk)
	gen := services.GetGenerator()

	go gen.ContinueWritingStream(
		req.NovelTitle, req.CharacterSetting, req.WorldSetting, req.PlotIdea, req.Genre,
		req.SubGenres, req.Pov, req.Pronouns,
		req.ExistingContent, req.CustomPrompt, targetWords, req.UseReflection, streamChan,
	)

	return streamSSE(c, streamChan)
}

// Cache Endpoints
func GetGenerationCacheEndpoint(c *fiber.Ctx) error {
	projectID := c.Params("project_id")
	cache, msg := services.LoadGenerationCache(projectID)
	if cache == nil {
		return c.Status(404).JSON(fiber.Map{"error": msg})
	}
	return c.JSON(fiber.Map{"cache": cache, "message": msg})
}

func SaveGenerationCacheEndpoint(c *fiber.Ctx) error {
	projectID := c.Params("project_id")
	var cacheData map[string]interface{}
	if err := c.BodyParser(&cacheData); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	success, msg := services.SaveGenerationCache(projectID, cacheData)
	if !success {
		return c.Status(500).JSON(fiber.Map{"error": msg})
	}
	return c.JSON(fiber.Map{"success": true, "message": msg})
}

func ClearGenerationCacheEndpoint(c *fiber.Ctx) error {
	projectID := c.Params("project_id")
	success, msg := services.ClearGenerationCache(projectID)
	if !success {
		return c.Status(500).JSON(fiber.Map{"error": msg})
	}
	return c.JSON(fiber.Map{"success": true, "message": msg})
}

func SaveChapterSummaryEndpoint(c *fiber.Ctx) error {
	type Request struct {
		ProjectID  string `json:"project_id"`
		ChapterNum int    `json:"chapter_num"`
		Summary    string `json:"summary"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	success, msg := services.SaveChapterSummary(req.ProjectID, req.ChapterNum, req.Summary)
	if !success {
		return c.Status(500).JSON(fiber.Map{"error": msg})
	}
	return c.JSON(fiber.Map{"success": true, "message": msg})
}

func GetChapterSummariesEndpoint(c *fiber.Ctx) error {
	projectID := c.Params("project_id")
	summaries, msg := services.LoadChapterSummaries(projectID)
	if summaries == nil {
		return c.Status(404).JSON(fiber.Map{"error": msg})
	}
	return c.JSON(fiber.Map{"summaries": summaries, "message": msg})
}
