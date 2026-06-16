package services

import (
	"log"
	"strings"
	"time"

	"github.com/namlevia/leviatech-story/internal/core"
)

type LoreEntry struct {
	ID        int    `json:"id"`
	ProjectID string `json:"project_id"`
	Name      string `json:"name"`
	Category  string `json:"category"`
	Keywords  string `json:"keywords"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

func CreateLoreEntry(projectID, name, category, keywords, content string) (*LoreEntry, string) {
	db := core.GetDB()

	// Check for duplicates to prevent piling up on re-tests
	var existingID int
	err := db.QueryRow("SELECT id FROM lore_entries WHERE project_id = ? AND name = ?", projectID, name).Scan(&existingID)
	if err == nil && existingID > 0 {
		// Already exists, skip insertion to prevent duplicates and preserve user edits
		return &LoreEntry{ID: existingID, Name: name}, ""
	}

	now := time.Now().Format(time.RFC3339)

	res, err := db.Exec(`
		INSERT INTO lore_entries (project_id, name, category, keywords, content, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, projectID, name, category, keywords, content, now, now)

	if err != nil {
		log.Printf("Error inserting lore entry: %v", err)
		return nil, "Lỗi khi thêm mới thẻ Lore"
	}

	id, _ := res.LastInsertId()
	return &LoreEntry{
		ID:        int(id),
		ProjectID: projectID,
		Name:      name,
		Category:  category,
		Keywords:  keywords,
		Content:   content,
		CreatedAt: now,
		UpdatedAt: now,
	}, ""
}

func GetLoreEntries(projectID string) ([]LoreEntry, string) {
	db := core.GetDB()
	rows, err := db.Query(`
		SELECT id, project_id, name, category, keywords, content, created_at, updated_at
		FROM lore_entries
		WHERE project_id = ?
		ORDER BY category ASC, name ASC
	`, projectID)
	if err != nil {
		log.Printf("Error fetching lore entries: %v", err)
		return nil, "Lỗi khi lấy danh sách thẻ Lore"
	}
	defer rows.Close()

	var entries []LoreEntry
	for rows.Next() {
		var e LoreEntry
		if err := rows.Scan(&e.ID, &e.ProjectID, &e.Name, &e.Category, &e.Keywords, &e.Content, &e.CreatedAt, &e.UpdatedAt); err != nil {
			log.Printf("Error scanning lore entry: %v", err)
			continue
		}
		entries = append(entries, e)
	}
	return entries, ""
}

func UpdateLoreEntry(id int, name, category, keywords, content string) (*LoreEntry, string) {
	db := core.GetDB()
	now := time.Now().Format(time.RFC3339)

	_, err := db.Exec(`
		UPDATE lore_entries
		SET name = ?, category = ?, keywords = ?, content = ?, updated_at = ?
		WHERE id = ?
	`, name, category, keywords, content, now, id)

	if err != nil {
		log.Printf("Error updating lore entry: %v", err)
		return nil, "Lỗi khi cập nhật thẻ Lore"
	}

	// Fetch updated
	var e LoreEntry
	err = db.QueryRow(`
		SELECT id, project_id, name, category, keywords, content, created_at, updated_at
		FROM lore_entries
		WHERE id = ?
	`, id).Scan(&e.ID, &e.ProjectID, &e.Name, &e.Category, &e.Keywords, &e.Content, &e.CreatedAt, &e.UpdatedAt)

	if err != nil {
		return nil, "Lỗi khi lấy thông tin thẻ Lore sau khi cập nhật"
	}

	return &e, ""
}

func DeleteLoreEntry(id int) string {
	db := core.GetDB()
	_, err := db.Exec("DELETE FROM lore_entries WHERE id = ?", id)
	if err != nil {
		log.Printf("Error deleting lore entry: %v", err)
		return "Lỗi khi xóa thẻ Lore"
	}
	return ""
}

// GetRelevantLore performs a simple keyword-based RAG extraction.
func GetRelevantLore(projectID, contextText string) string {
	entries, _ := GetLoreEntries(projectID)
	if len(entries) == 0 {
		return ""
	}

	// Chuyển toàn bộ contextText về chữ thường để dễ tìm kiếm (case-insensitive)
	lowerContext := strings.ToLower(contextText)
	var matchedEntries []LoreEntry

	for _, e := range entries {
		// Kiểm tra theo Tên
		if strings.Contains(lowerContext, strings.ToLower(e.Name)) {
			matchedEntries = append(matchedEntries, e)
			continue
		}
		
		// Kiểm tra theo Keywords (phân cách bằng dấu phẩy)
		if e.Keywords != "" {
			kws := strings.Split(e.Keywords, ",")
			matched := false
			for _, kw := range kws {
				cleanKw := strings.TrimSpace(strings.ToLower(kw))
				if cleanKw != "" && strings.Contains(lowerContext, cleanKw) {
					matchedEntries = append(matchedEntries, e)
					matched = true
					break
				}
			}
			if matched {
				continue
			}
		}
	}

	if len(matchedEntries) == 0 {
		return ""
	}

	var sb strings.Builder
	sb.WriteString("\n[HỒ SƠ LOREBOOK TỰ ĐỘNG TRÍCH XUẤT TỪ CƠ SỞ DỮ LIỆU]\n")
	sb.WriteString("Hệ thống phát hiện các thực thể sau có thể xuất hiện trong chương này, hãy tuân thủ nghiêm ngặt các thiết lập dưới đây:\n\n")

	for _, e := range matchedEntries {
		sb.WriteString("--- ")
		sb.WriteString(e.Category)
		sb.WriteString(": ")
		sb.WriteString(e.Name)
		sb.WriteString(" ---\n")
		sb.WriteString(e.Content)
		sb.WriteString("\n\n")
	}

	return sb.String()
}
