package services

import (
	"encoding/json"
	"log"
	"time"

	"github.com/namlevia/leviatech-story/internal/core"
	"github.com/namlevia/leviatech-story/internal/utils"
)

// SaveGenerationCache saves the generation cache dict to SQLite
func SaveGenerationCache(projectID string, cacheData map[string]interface{}) (bool, string) {
	if stringsTrimSpace(projectID) == "" {
		return false, utils.T("generator.cache_id_empty")
	}
	if cacheData == nil {
		return false, utils.T("generator.cache_data_empty")
	}

	db := core.GetDB()
	now := time.Now().Format(time.RFC3339)

	b, err := json.Marshal(cacheData)
	if err != nil {
		return false, utils.T("generator.cache_save_failed", map[string]interface{}{"error": err.Error()})
	}

	_, err = db.Exec(
		"INSERT OR REPLACE INTO generation_cache (project_id, data, updated_at) VALUES (?, ?, ?)",
		projectID, string(b), now,
	)
	if err != nil {
		log.Printf("Cache save failed: %v", err)
		return false, utils.T("generator.cache_save_failed", map[string]interface{}{"error": err.Error()})
	}

	return true, utils.T("generator.cache_save_success")
}

func LoadGenerationCache(projectID string) (map[string]interface{}, string) {
	if stringsTrimSpace(projectID) == "" {
		return nil, utils.T("generator.cache_id_empty")
	}

	db := core.GetDB()
	var data string
	err := db.QueryRow("SELECT data FROM generation_cache WHERE project_id = ?", projectID).Scan(&data)
	if err != nil {
		return nil, utils.T("generator.cache_not_found")
	}

	var cacheData map[string]interface{}
	if err := json.Unmarshal([]byte(data), &cacheData); err != nil {
		return nil, utils.T("generator.cache_load_failed", map[string]interface{}{"error": err.Error()})
	}

	return cacheData, utils.T("generator.cache_load_success")
}

func ClearGenerationCache(projectID string) (bool, string) {
	if stringsTrimSpace(projectID) == "" {
		return false, utils.T("generator.cache_id_empty")
	}

	db := core.GetDB()
	res, err := db.Exec("DELETE FROM generation_cache WHERE project_id = ?", projectID)
	if err != nil {
		return false, utils.T("generator.cache_clear_failed", map[string]interface{}{"error": err.Error()})
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return false, utils.T("generator.cache_not_found")
	}

	return true, utils.T("generator.cache_clear_success")
}

// Chapter Summary functions
func SaveChapterSummary(projectID string, chapterNum int, summary string) (bool, string) {
	if stringsTrimSpace(projectID) == "" {
		return false, utils.T("generator.cache_id_empty")
	}
	if stringsTrimSpace(summary) == "" {
		return false, utils.T("generator.summary_empty")
	}

	db := core.GetDB()
	now := time.Now().Format(time.RFC3339)

	_, err := db.Exec(`
		INSERT OR REPLACE INTO chapter_summaries 
		(project_id, chapter_num, summary, generated_at)
		VALUES (?, ?, ?, ?)
	`, projectID, chapterNum, summary, now)

	if err != nil {
		return false, utils.T("generator.summary_save_failed", map[string]interface{}{"error": err.Error()})
	}
	return true, utils.T("generator.summary_save_success")
}

type ChapterSummary struct {
	ChapterNum  int    `json:"chapter_num"`
	Summary     string `json:"summary"`
	GeneratedAt string `json:"generated_at"`
}

func LoadChapterSummaries(projectID string) ([]ChapterSummary, string) {
	if stringsTrimSpace(projectID) == "" {
		return nil, utils.T("generator.cache_id_empty")
	}

	db := core.GetDB()
	rows, err := db.Query(`
		SELECT chapter_num, summary, generated_at 
		FROM chapter_summaries 
		WHERE project_id = ? 
		ORDER BY chapter_num DESC
	`, projectID) // Python sorts to descending later for context building

	if err != nil {
		return nil, utils.T("generator.summary_load_failed", map[string]interface{}{"error": err.Error()})
	}
	defer rows.Close()

	var summaries []ChapterSummary
	for rows.Next() {
		var s ChapterSummary
		if err := rows.Scan(&s.ChapterNum, &s.Summary, &s.GeneratedAt); err == nil {
			summaries = append(summaries, s)
		}
	}

	if len(summaries) == 0 {
		return nil, utils.T("generator.summary_dir_not_found")
	}

	return summaries, utils.T("generator.summary_load_done", map[string]interface{}{"count": len(summaries)})
}

func BuildContextFromSummaries(summaries []ChapterSummary, maxContextLength int) string {
	if len(summaries) == 0 {
		return ""
	}

	// summaries is expected to be sorted descending (highest chapter first)
	var contextParts []string
	currentLength := 0

	for _, s := range summaries {
		if s.Summary == "" {
			continue
		}

		part := utils.T("prompts.chapter_context_line", map[string]interface{}{
			"chapter_num": s.ChapterNum,
			"summary":     s.Summary,
		})

		if currentLength+len(part) > maxContextLength {
			break
		}

		contextParts = append(contextParts, part)
		currentLength += len(part)
	}

	// reverse the slice so that it's chronological
	for i, j := 0, len(contextParts)-1; i < j; i, j = i+1, j-1 {
		contextParts[i], contextParts[j] = contextParts[j], contextParts[i]
	}

	if len(contextParts) > 0 {
		return utils.T("prompts.context_header") + "\n" + stringsJoin(contextParts, "\n")
	}
	return ""
}

// Helpers
func stringsTrimSpace(s string) string {
	for len(s) > 0 && s[0] == ' ' {
		s = s[1:]
	}
	for len(s) > 0 && s[len(s)-1] == ' ' {
		s = s[:len(s)-1]
	}
	return s
}

func stringsJoin(elems []string, sep string) string {
	if len(elems) == 0 {
		return ""
	}
	if len(elems) == 1 {
		return elems[0]
	}
	n := len(sep) * (len(elems) - 1)
	for i := 0; i < len(elems); i++ {
		n += len(elems[i])
	}
	b := make([]byte, n)
	bp := copy(b, elems[0])
	for _, s := range elems[1:] {
		bp += copy(b[bp:], sep)
		bp += copy(b[bp:], s)
	}
	return string(b)
}
