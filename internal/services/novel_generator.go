package services

import (
	"encoding/json"
	"fmt"
	"log"
	"regexp"
	"strconv"
	"strings"

	"github.com/namlevia/leviatech-story/internal/core"
	"github.com/namlevia/leviatech-story/internal/utils"
	"github.com/sashabaranov/go-openai"
)

type NovelGenerator struct {
	APIClient *APIClient
}

var generatorInstance *NovelGenerator

func GetGenerator() *NovelGenerator {
	if generatorInstance == nil {
		generatorInstance = &NovelGenerator{
			APIClient: GetAPIClient(),
		}
	}
	return generatorInstance
}

func (g *NovelGenerator) buildStyleDescription() string {
	config := core.GetConfig()
	genConfig := config.Generation
	styleName := genConfig.WritingStyle
	styleDesc := StyleManager.GetDescription(styleName)

	fullStyle := styleName
	if styleDesc != "" {
		fullStyle += fmt.Sprintf(" (%s)", styleDesc)
	}

	return utils.T("prompts.style_description", map[string]interface{}{
		"writing_style":         fullStyle,
		"writing_tone":          genConfig.WritingTone,
		"character_development": genConfig.CharacterDevelopment,
		"plot_complexity":       genConfig.PlotComplexity,
	})
}

// OutlineParser
func ParseOutline(outlineText string) ([]core.Chapter, string) {
	if stringsTrimSpace(outlineText) == "" {
		return nil, utils.T("generator.outline_empty")
	}

	var chapters []core.Chapter
	lines := strings.Split(outlineText, "\n")
	chapterCount := 0

	patterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)(?:第\s*|Chương\s*|Chapter\s*)(\d+)(?:\s*章)?[：:\s]+([^\-—–]+)[-—–]\s*(.+)`),
		regexp.MustCompile(`(?i)(?:第\s*|Chương\s*|Chapter\s*)(\d+)(?:\s*章)?[：:\s]+(.+)`),
	}

	cleanTitleRegex := regexp.MustCompile(`(?i)^\s*(?:第\s*\d+\s*章|Chương\s*\d+|Chapter\s*\d+)[：:\-\s]*`)

	for _, line := range lines {
		line = stringsTrimSpace(line)
		if line == "" {
			continue
		}

		matched := false
		for _, pat := range patterns {
			match := pat.FindStringSubmatch(line)
			if match == nil {
				continue
			}

			var num int
			var title, desc string

			if len(match) >= 4 {
				num, _ = strconv.Atoi(match[1])
				title = stringsTrimSpace(match[2])
				desc = stringsTrimSpace(match[3])
			} else {
				num, _ = strconv.Atoi(match[1])
				rest := stringsTrimSpace(match[2])
				if strings.ContainsAny(rest, "-—–") {
					parts := regexp.MustCompile(`[-—–]`).Split(rest, 2)
					title = stringsTrimSpace(parts[0])
					if len(parts) > 1 {
						desc = stringsTrimSpace(parts[1])
					}
				} else {
					title = rest
				}
			}

			if title == "" {
				matched = true
				break
			}

			title = cleanTitleRegex.ReplaceAllString(title, "")
			chapters = append(chapters, core.Chapter{Num: num, Title: title, Desc: desc})
			chapterCount++
			matched = true
			break
		}

		if !matched {
			// Nếu đã bắt đầu có chương, các dòng không match (ví dụ dòng mô tả phụ) sẽ được cộng dồn vào mô tả chương trước đó
			if len(chapters) > 0 {
				// Không cộng dồn các gạch đầu dòng markdown vô nghĩa nếu nó đứng một mình
				if regexp.MustCompile(`^[-—–]+$`).MatchString(line) || strings.HasPrefix(line, "#") {
					continue
				}
				chapters[len(chapters)-1].Desc += "\n" + line
			}
		} else {
			// Dọn dẹp markdown asterisks khỏi tiêu đề đã match
			chapters[len(chapters)-1].Title = strings.ReplaceAll(chapters[len(chapters)-1].Title, "**", "")
			chapters[len(chapters)-1].Title = strings.ReplaceAll(chapters[len(chapters)-1].Title, "*", "")
			chapters[len(chapters)-1].Title = stringsTrimSpace(chapters[len(chapters)-1].Title)
		}
	}

	if len(chapters) == 0 {
		return nil, utils.T("generator.outline_parse_failed")
	}

	for i := range chapters {
		chapters[i].Num = i + 1
	}

	return chapters, utils.T("generator.outline_parse_success", map[string]interface{}{"count": len(chapters)})
}

// Generate Outline
func (g *NovelGenerator) GenerateOutline(
	title, genre string,
	subGenres []string,
	pov, pronouns string,
	totalChapters int,
	characterSetting, worldSetting, plotIdea, customOutlinePrompt string,
) (string, string) {
	if stringsTrimSpace(title) == "" {
		return "", utils.T("generator.title_empty")
	}
	if stringsTrimSpace(characterSetting) == "" {
		return "", utils.T("generator.char_empty")
	}
	if stringsTrimSpace(worldSetting) == "" {
		return "", utils.T("generator.world_empty")
	}
	if stringsTrimSpace(plotIdea) == "" {
		return "", utils.T("generator.plot_empty")
	}
	if totalChapters <= 0 {
		totalChapters = 20
	}

	styleDesc := g.buildStyleDescription()

	genreDesc := GenreManager.GetDescription(genre)
	if genreDesc != "" {
		styleDesc += fmt.Sprintf("\n\nHướng dẫn viết riêng cho thể loại %s: %s", genre, genreDesc)
	}

	if len(subGenres) > 0 {
		var subDetails []string
		for _, sg := range subGenres {
			desc := SubGenreManager.GetDescription(sg)
			if desc != "" {
				subDetails = append(subDetails, fmt.Sprintf("- %s: %s", sg, desc))
			} else {
				subDetails = append(subDetails, fmt.Sprintf("- %s", sg))
			}
		}
		styleDesc += "\n\nCác chủ đề con (Tag) bổ sung:\n" + stringsJoin(subDetails, "\n") + "\n\nHãy kết hợp chặt chẽ các đặc điểm của những chủ đề này để làm phong phú cấu trúc cốt truyện."
	}

	customPromptStr := ""
	if stringsTrimSpace(customOutlinePrompt) != "" {
		customPromptStr = fmt.Sprintf("Yêu cầu chuyên biệt của tác giả:\n%s\n\n", customOutlinePrompt)
	}

	prompt := utils.T("prompts.outline_user", map[string]interface{}{
		"genre":             genre,
		"title":             title,
		"character_setting": characterSetting,
		"world_setting":     worldSetting,
		"plot_idea":         plotIdea,
		"pov":               pov,
		"pronouns":          pronouns,
		"style_desc":        styleDesc,
		"custom_prompt":     customPromptStr,
		"total_chapters":    totalChapters,
	})

	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: utils.T("prompts.outline_system")},
		{Role: openai.ChatMessageRoleUser, Content: prompt},
	}

	success, content := g.APIClient.Generate(messages, true, 3, 2.0)
	if !success {
		return "", content
	}

	return content, utils.T("generator.outline_gen_success")
}

// Generate Chapter (Streaming)
func (g *NovelGenerator) GenerateChapterStream(
	projectID string,
	chapterNum int,
	chapterTitle, chapterDesc, novelTitle, characterSetting, worldSetting, plotIdea, genre string,
	subGenres []string, pov, pronouns, previousContent, contextSummary, customPrompt string, useReflection bool,
	streamChan chan<- StreamChunk,
) {
	defer close(streamChan)
	targetWords := core.GetConfig().Generation.ChapterTargetWords
	if targetWords <= 0 {
		targetWords = 4000
	}

	if g.APIClient == nil {
		streamChan <- StreamChunk{Success: false, Content: "API Client chưa được khởi tạo", Done: true}
		return
	}

	// 1. Rút trích Lorebook Context
	loreContext := GetRelevantLore(projectID, contextSummary+" "+customPrompt+" "+previousContent)
	if loreContext != "" {
		worldSetting = worldSetting + "\n" + loreContext
	}

	styleDesc := g.buildStyleDescription()
	if genre != "" {
		genreDesc := GenreManager.GetDescription(genre)
		if genreDesc != "" {
			styleDesc += fmt.Sprintf("\n\nHướng dẫn viết riêng cho thể loại %s: %s", genre, genreDesc)
		}
	}

	if len(subGenres) > 0 {
		var subDetails []string
		for _, sg := range subGenres {
			desc := SubGenreManager.GetDescription(sg)
			if desc != "" {
				subDetails = append(subDetails, fmt.Sprintf("- %s: %s", sg, desc))
			} else {
				subDetails = append(subDetails, fmt.Sprintf("- %s", sg))
			}
		}
		styleDesc += "\n\nCác chủ đề con (Tag) bổ sung:\n" + stringsJoin(subDetails, "\n") + "\n\nHãy kết hợp chặt chẽ các đặc điểm và yếu tố của những chủ đề này vào nội dung chương truyện."
	}

	targetWords = core.GetConfig().Generation.ChapterTargetWords

	continuityPrompt := ""
	if previousContent != "" {
		if len(previousContent) > 3000 {
			previousContent = previousContent[len(previousContent)-3000:]
		}
		continuityPrompt = utils.T("prompts.continuity_prompt", map[string]interface{}{"previous_content": previousContent})
	}

	contextPrompt := ""
	if contextSummary != "" {
		contextPrompt = utils.T("prompts.context_prompt", map[string]interface{}{"context_summary": contextSummary})
	}

	prompt := utils.T("prompts.chapter_user", map[string]interface{}{
		"novel_title":       novelTitle,
		"chapter_num":       chapterNum,
		"chapter_title":     chapterTitle,
		"chapter_desc":      chapterDesc,
		"character_setting": characterSetting,
		"world_setting":     worldSetting,
		"plot_idea":         plotIdea,
		"pov":               pov,
		"pronouns":          pronouns,
		"style_desc":        styleDesc,
		"target_words":      targetWords,
		"continuity_prompt": continuityPrompt,
		"context_prompt":    contextPrompt,
	})

	if customPrompt != "" {
		prompt += fmt.Sprintf("\n\n[Yêu cầu bổ sung của tác giả]:\n%s", customPrompt)
	}

	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: utils.T("prompts.chapter_system")},
		{Role: openai.ChatMessageRoleUser, Content: prompt},
	}

	if !useReflection {
		ch := make(chan StreamChunk)
		go g.APIClient.GenerateStream(messages, ch)
		for chunk := range ch {
			streamChan <- chunk
		}
	} else {
		log.Println("Generating draft for reflection in streaming mode...")
		
		// Send a system message to indicate draft mode
		streamChan <- StreamChunk{Success: true, Content: "_[Hệ thống]: Đang viết bản nháp..._\n\n"}
		
		chDraft := make(chan StreamChunk)
		go g.APIClient.GenerateStream(messages, chDraft)
		
		var draftBuilder strings.Builder
		for chunk := range chDraft {
			if !chunk.Success {
				streamChan <- chunk
				return
			}
			if chunk.Done {
				break
			}
			draftBuilder.WriteString(chunk.Content)
			// Stream the draft so the user doesn't time out and knows it's working
			streamChan <- chunk
		}
		
		draftContent := draftBuilder.String()
		if draftContent == "" {
			streamChan <- StreamChunk{Success: false, Content: "Lỗi: Không thể sinh bản nháp."}
			return
		}

		// Clear the draft from the frontend UI
		streamChan <- StreamChunk{Success: true, Clear: true}
		streamChan <- StreamChunk{Success: true, Content: "_[Hệ thống]: Đang trau chuốt bản chính thức..._\n\n"}

		reflectionSys := utils.T("prompts.reflection_system")
		reflectionPrompt := utils.T("prompts.reflection_user", map[string]interface{}{
			"chapter_req":   prompt,
			"draft_content": draftContent,
			"target_words":  targetWords,
		})

		reflectionMessages := []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: reflectionSys},
			{Role: openai.ChatMessageRoleUser, Content: reflectionPrompt},
		}

		ch := make(chan StreamChunk)
		go g.APIClient.GenerateStream(reflectionMessages, ch)
		isFirstChunk := true
		for chunk := range ch {
			if isFirstChunk && chunk.Success && chunk.Content != "" {
				streamChan <- StreamChunk{Success: true, Clear: true}
				isFirstChunk = false
			}
			streamChan <- chunk
		}
	}
}

func (g *NovelGenerator) SuggestTitle(genre string, subGenres []string, customPrompt string) (string, string) {
	systemPrompt := utils.T("prompts.suggest_system")
	genreDesc := GenreManager.GetDescription(genre)
	if genreDesc != "" {
		systemPrompt += fmt.Sprintf("\n\nLưu ý bám sát hướng dẫn viết thể loại %s: %s", genre, genreDesc)
	}

	if len(subGenres) > 0 {
		var subDetails []string
		for _, sg := range subGenres {
			desc := SubGenreManager.GetDescription(sg)
			if desc != "" {
				subDetails = append(subDetails, fmt.Sprintf("- %s: %s", sg, desc))
			} else {
				subDetails = append(subDetails, fmt.Sprintf("- %s", sg))
			}
		}
		systemPrompt += "\n\nCác chủ đề con (Tag) bổ sung:\n" + stringsJoin(subDetails, "\n") + "\n\nVui lòng xem xét các chủ đề này khi đề xuất."
	}

	var userPrompt string
	if stringsTrimSpace(customPrompt) != "" {
		userPrompt = fmt.Sprintf("%s\n\nYêu cầu bổ sung của tác giả:\n%s", utils.T("prompts.suggest_title_user", map[string]interface{}{"genre": genre}), customPrompt)
	} else {
		userPrompt = utils.T("prompts.suggest_title_user", map[string]interface{}{"genre": genre})
	}

	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: systemPrompt},
		{Role: openai.ChatMessageRoleUser, Content: userPrompt},
	}

	success, content := g.APIClient.Generate(messages, false, 3, 2.0)
	if !success {
		return "", content
	}

	return content, utils.T("generator.suggest_success")
}

func (g *NovelGenerator) SuggestContent(contentType, title, genre string, subGenres []string, characterSetting, worldSetting, customPrompt string, numMain, numSub int) (string, string) {
	systemPrompt := utils.T("prompts.suggest_system")
	genreDesc := GenreManager.GetDescription(genre)
	if genreDesc != "" {
		systemPrompt += fmt.Sprintf("\n\nLưu ý bám sát hướng dẫn viết thể loại %s: %s", genre, genreDesc)
	}

	if len(subGenres) > 0 {
		var subDetails []string
		for _, sg := range subGenres {
			desc := SubGenreManager.GetDescription(sg)
			if desc != "" {
				subDetails = append(subDetails, fmt.Sprintf("- %s: %s", sg, desc))
			} else {
				subDetails = append(subDetails, fmt.Sprintf("- %s", sg))
			}
		}
		systemPrompt += "\n\nCác chủ đề con (Tag) bổ sung:\n" + stringsJoin(subDetails, "\n") + "\n\nVui lòng kết hợp các yếu tố của chủ đề này."
	}

	var userPrompt string
	switch contentType {
	case "char":
		userPrompt = utils.T("prompts.suggest_char_user", map[string]interface{}{
			"title":          title,
			"genre":          genre,
			"num_main_chars": numMain,
			"num_sub_chars":  numSub,
		})
	case "world":
		userPrompt = utils.T("prompts.suggest_world_user", map[string]interface{}{
			"title": title,
			"genre": genre,
		})
	case "plot":
		userPrompt = utils.T("prompts.suggest_plot_user", map[string]interface{}{
			"title":             title,
			"genre":             genre,
			"character_setting": characterSetting,
			"world_setting":     worldSetting,
		})
	default:
		return "", "Invalid content type"
	}

	if stringsTrimSpace(customPrompt) != "" {
		userPrompt += fmt.Sprintf("\n\nYêu cầu bổ sung của tác giả:\n%s", customPrompt)
	}

	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: systemPrompt},
		{Role: openai.ChatMessageRoleUser, Content: userPrompt},
	}

	success, content := g.APIClient.Generate(messages, false, 3, 2.0)
	if !success {
		return "", content
	}

	return content, utils.T("generator.suggest_success")
}

func (g *NovelGenerator) GenerateChapterSummary(chapterContent, chapterTitle string) (string, string) {
	if stringsTrimSpace(chapterContent) == "" {
		return "", utils.T("generator.summary_content_empty")
	}

	contentToSummarize := chapterContent
	if len(contentToSummarize) > 3000 {
		contentToSummarize = contentToSummarize[:3000]
	}

	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: utils.T("prompts.chapter_summary_system")},
		{Role: openai.ChatMessageRoleUser, Content: utils.T("prompts.chapter_summary_user", map[string]interface{}{
			"chapter_title":   chapterTitle,
			"chapter_content": contentToSummarize,
		})},
	}

	success, summary := g.APIClient.Generate(messages, false, 3, 2.0)
	if success && summary != "" {
		return stringsTrimSpace(summary), utils.T("generator.summary_gen_success")
	}

	if summary == "" {
		summary = utils.T("generator.summary_gen_failed")
	}
	return "", summary
}

func (g *NovelGenerator) RewriteParagraph(text, styleTemplate string, useReflection bool) (string, string) {
	if stringsTrimSpace(text) == "" {
		return "", utils.T("generator.text_empty")
	}
	if len(text) > 20000 {
		return "", utils.T("generator.text_too_long_rewrite")
	}

	style := styleTemplate
	if style == "" {
		style = utils.T("templates.default") // fallback
	}

	prompt := utils.T("prompts.rewrite_user", map[string]interface{}{"style": style, "text": text})

	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: utils.T("prompts.rewrite_system")},
		{Role: openai.ChatMessageRoleUser, Content: prompt},
	}

	maxRetries := 3
	var content string

	for attempt := 0; attempt < maxRetries; attempt++ {
		success, attemptContent := g.APIClient.Generate(messages, false, 3, 2.0)
		content = attemptContent

		if !success {
			if attempt < maxRetries-1 {
				continue
			}
			return "", content
		}

		if stringsTrimSpace(content) == "" {
			if attempt < maxRetries-1 {
				continue
			}
			return "", utils.T("generator.api_empty_content")
		}

		if len(stringsTrimSpace(content)) < 50 {
			if attempt < maxRetries-1 {
				continue
			}
			return "", utils.T("generator.rewrite_too_short", map[string]interface{}{"length": len(content)})
		}

		if useReflection {
			log.Println("Applying self-reflection to rewritten paragraph draft...")
			reflectionSys := utils.T("prompts.reflection_system")
			reflectionPrompt := utils.T("prompts.reflection_user", map[string]interface{}{
				"chapter_req":   prompt,
				"draft_content": content,
				"target_words":  len(content),
			})

			reflectionMessages := []openai.ChatCompletionMessage{
				{Role: openai.ChatMessageRoleSystem, Content: reflectionSys},
				{Role: openai.ChatMessageRoleUser, Content: reflectionPrompt},
			}

			if success, finalContent := g.APIClient.Generate(reflectionMessages, false, 3, 2.0); success {
				content = finalContent
			}
		}

		return content, utils.T("generator.rewrite_success")
	}

	return "", utils.T("generator.rewrite_failed_retries", map[string]interface{}{"max": maxRetries})
}

func (g *NovelGenerator) PolishText(text, polishType, customRequirements string, useReflection bool) (string, string) {
	if stringsTrimSpace(text) == "" {
		return "", utils.T("generator.text_empty")
	}

	if len(text) > 10000 {
		return "", utils.T("generator.text_too_long_polish")
	}

	var prompt string
	switch polishType {
	case "find_errors":
		prompt = utils.T("prompts.polish_find_errors")
	case "suggest_improvements":
		prompt = utils.T("prompts.polish_suggest")
	case "direct_modify":
		prompt = utils.T("prompts.polish_direct")
	case "remove_ai_flavor":
		prompt = utils.T("prompts.polish_remove_ai")
	case "enhance_details":
		prompt = utils.T("prompts.polish_enhance")
	case "optimize_dialogue":
		prompt = utils.T("prompts.polish_dialogue")
	case "improve_pacing":
		prompt = utils.T("prompts.polish_pacing")
	default:
		prompt = utils.T("prompts.polish_general")
	}

	if customRequirements != "" {
		prompt += utils.T("prompts.polish_extra_req", map[string]interface{}{"custom_requirements": customRequirements})
	}
	prompt += utils.T("prompts.polish_output_only", map[string]interface{}{"text": text})

	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: utils.T("prompts.polish_system")},
		{Role: openai.ChatMessageRoleUser, Content: prompt},
	}

	maxRetries := 3
	var content string

	for attempt := 0; attempt < maxRetries; attempt++ {
		success, attemptContent := g.APIClient.Generate(messages, false, 3, 2.0)
		content = attemptContent

		if !success {
			if attempt < maxRetries-1 {
				continue
			}
			return "", content
		}

		if stringsTrimSpace(content) == "" {
			if attempt < maxRetries-1 {
				continue
			}
			return "", utils.T("generator.api_empty_content")
		}

		if len(stringsTrimSpace(content)) < 50 {
			if attempt < maxRetries-1 {
				continue
			}
			return "", utils.T("generator.polish_too_short", map[string]interface{}{"length": len(content)})
		}

		if useReflection {
			reflectionSys := utils.T("prompts.reflection_system")
			reflectionPrompt := utils.T("prompts.reflection_user", map[string]interface{}{
				"chapter_req":   prompt,
				"draft_content": content,
				"target_words":  len(content),
			})

			reflectionMessages := []openai.ChatCompletionMessage{
				{Role: openai.ChatMessageRoleSystem, Content: reflectionSys},
				{Role: openai.ChatMessageRoleUser, Content: reflectionPrompt},
			}

			if success, finalContent := g.APIClient.Generate(reflectionMessages, false, 3, 2.0); success {
				content = finalContent
			}
		}

		return content, utils.T("generator.polish_success")
	}

	return "", utils.T("generator.polish_failed_retries", map[string]interface{}{"max": maxRetries})
}

func (g *NovelGenerator) ContinueWritingStream(
	novelTitle, characterSetting, worldSetting, plotIdea, pov, pronouns, existingContent, customPrompt string,
	targetWords int,
	useReflection bool,
	streamChan chan<- StreamChunk,
) {
	defer close(streamChan)

	if stringsTrimSpace(existingContent) == "" {
		streamChan <- StreamChunk{Success: false, Content: utils.T("generator.text_empty")}
		return
	}

	contentForContext := existingContent
	if len(contentForContext) > 5000 {
		contentForContext = contentForContext[len(contentForContext)-5000:]
	}

	prompt := utils.T("prompts.continue_user", map[string]interface{}{
		"novel_title":       novelTitle,
		"character_setting": characterSetting,
		"world_setting":     worldSetting,
		"plot_idea":         plotIdea,
		"pov":               pov,
		"pronouns":          pronouns,
		"style_desc":        g.buildStyleDescription(),
		"previous_content":  contentForContext,
		"target_words":      targetWords,
	})

	if customPrompt != "" {
		prompt += fmt.Sprintf("\n\n[Yêu cầu bổ sung của tác giả]:\n%s", customPrompt)
	}

	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: utils.T("prompts.continue_system")},
		{Role: openai.ChatMessageRoleUser, Content: prompt},
	}

	if !useReflection {
		ch := make(chan StreamChunk)
		go g.APIClient.GenerateStream(messages, ch)
		for chunk := range ch {
			streamChan <- chunk
		}
	} else {
		log.Println("Generating draft for continue writing reflection in streaming mode...")
		success, draftContent := g.APIClient.Generate(messages, false, 3, 2.0)
		if !success {
			streamChan <- StreamChunk{Success: false, Content: draftContent}
			return
		}

		reflectionSys := utils.T("prompts.reflection_system")
		reflectionPrompt := utils.T("prompts.reflection_user", map[string]interface{}{
			"chapter_req":   prompt,
			"draft_content": draftContent,
			"target_words":  targetWords,
		})

		reflectionMessages := []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: reflectionSys},
			{Role: openai.ChatMessageRoleUser, Content: reflectionPrompt},
		}

		ch := make(chan StreamChunk)
		go g.APIClient.GenerateStream(reflectionMessages, ch)
		isFirstChunk := true
		for chunk := range ch {
			if isFirstChunk && chunk.Success && chunk.Content != "" {
				streamChan <- StreamChunk{Success: true, Clear: true}
				isFirstChunk = false
			}
			streamChan <- chunk
		}
	}
}

func (g *NovelGenerator) SuggestStyleTone(genre string, subGenres []string) (string, string, string) {
	styles, _ := StyleManager.Load()
	tones, _ := ToneManager.Load()

	var styleNames []string
	for _, s := range styles {
		styleNames = append(styleNames, s.Name)
	}
	var toneNames []string
	for _, t := range tones {
		toneNames = append(toneNames, t.Name)
	}

	prompt := fmt.Sprintf(`Dựa vào Thể loại chính: "%s" và Chủ đề con: "%s", hãy đề xuất 1 Văn phong và 1 Giọng điệu phù hợp nhất cho tiểu thuyết này.
BẠN BẮT BUỘC PHẢI CHỌN CHÍNH XÁC TỪ DANH SÁCH DƯỚI ĐÂY (không được tự bịa ra tên khác):

Danh sách Văn phong có sẵn: %s
Danh sách Giọng điệu có sẵn: %s

Trích xuất kết quả dưới dạng JSON với cấu trúc:
{
  "style": "Tên văn phong đã chọn",
  "tone": "Tên giọng điệu đã chọn"
}`, genre, strings.Join(subGenres, ", "), strings.Join(styleNames, ", "), strings.Join(toneNames, ", "))

	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleUser, Content: prompt},
	}

	success, response := g.APIClient.Generate(messages, true, 3, 0.7)
	if !success {
		return "", "", response
	}

	type Result struct {
		Style string `json:"style"`
		Tone  string `json:"tone"`
	}
	var res Result
	
	// Extract JSON block using regex to handle markdown wrappers or extra text
	jsonRegex := regexp.MustCompile(`(?s)\{.*\}`)
	match := jsonRegex.FindString(response)
	if match != "" {
		response = match
	}

	err := json.Unmarshal([]byte(response), &res)
	if err != nil {
		log.Printf("AI JSON Unmarshal error: %v, raw response: %s", err, response)
		return "", "", "Lỗi xử lý phản hồi từ AI"
	}

	return res.Style, res.Tone, ""
}

type AutoLoreEntry struct {
	Name     string `json:"name"`
	Category string `json:"category"`
	Keywords string `json:"keywords"`
	Content  string `json:"content"`
}

func (g *NovelGenerator) ExtractAndSaveLore(projectID, characterSetting, worldSetting string) {
	if characterSetting == "" && worldSetting == "" {
		return
	}

	prompt := fmt.Sprintf(`Hãy trích xuất danh sách các nhân vật, địa danh, thế lực, cảnh giới, vật phẩm từ đoạn văn bản thiết lập dưới đây.
Trả về DUY NHẤT một mảng JSON hợp lệ chứa các object. KHÔNG GIẢI THÍCH GÌ THÊM, KHÔNG TẠO BẢNG MARKDOWN, KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO BÊN NGOÀI MẢNG JSON.
LƯU Ý ĐỂ TRÁNH LỖI JSON (QUAN TRỌNG): 
- Tất cả keys và values kiểu chuỗi PHẢI được bọc trong dấu ngoặc kép kép ("). Tuyệt đối KHÔNG dùng dấu nháy đơn (').
- Nếu nội dung có chứa dấu ngoặc kép ("), hãy đổi nó thành dấu nháy đơn (') để tránh phá vỡ JSON.
- Tuyệt đối KHÔNG dùng ký tự xuống dòng (enter/newline) bên trong chuỗi string. Hãy viết liền trên 1 dòng hoặc dùng \n.
- KHÔNG tạo bất kỳ cấu trúc bảng nào (không dùng ký tự |). Toàn bộ dữ liệu phải nằm đúng chuẩn format JSON.

Cấu trúc mảng JSON mẫu yêu cầu:
[
  {
    "name": "Tiêu Viêm",
    "category": "Nhân vật",
    "keywords": "Tiểu Viêm tử, Viêm ca",
    "content": "Thiếu niên thiên tài..."
  }
]

Văn bản thiết lập:
%s
%s
`, characterSetting, worldSetting)

	log.Println("[AutoLore] Bắt đầu trích xuất Lorebook cho dự án", projectID)

	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleUser, Content: prompt},
	}

	success, resp := g.APIClient.Generate(messages, false, 3, 1.0)
	if !success {
		log.Println("[AutoLore] Lỗi khi gọi AI:", resp)
		return
	}

	// Bóc tách mảng JSON từ phản hồi AI
	re := regexp.MustCompile(`(?s)\[\s*\{.*?\}\s*\]`)
	match := re.FindString(resp)
	if match == "" {
		log.Println("[AutoLore] Không tìm thấy JSON hợp lệ trong phản hồi:", resp)
		return
	}

	var parsedEntries []AutoLoreEntry
	if err := json.Unmarshal([]byte(match), &parsedEntries); err != nil {
		log.Println("[AutoLore] Lỗi parse JSON:", err)
		return
	}

	count := 0
	for _, e := range parsedEntries {
		if e.Name == "" || e.Content == "" {
			continue
		}
		
		_, errMsg := CreateLoreEntry(projectID, e.Name, e.Category, e.Keywords, e.Content)
		if errMsg != "" {
			log.Println("[AutoLore] Lỗi lưu thẻ:", errMsg)
		} else {
			count++
		}
	}

	log.Printf("[AutoLore] Hoàn tất trích xuất. Đã lưu %d thẻ cho dự án %s\n", count, projectID)
}
