package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/namlevia/leviatech-story/internal/core"
)

type ProjectManager struct{}

func NewProjectManager() *ProjectManager {
	return &ProjectManager{}
}

func (pm *ProjectManager) CreateProject(title, genre string, subGenres []string, charSetting, worldSetting, plotIdea string) (*core.NovelProject, error) {
	if strings.TrimSpace(title) == "" {
		return nil, fmt.Errorf("title cannot be empty")
	}

	projectID := core.Slugify(title)
	now := time.Now().Format(time.RFC3339)

	project := &core.NovelProject{
		ID:               projectID,
		Title:            strings.TrimSpace(title),
		Genre:            strings.TrimSpace(genre),
		SubGenres:        subGenres,
		CharacterSetting: strings.TrimSpace(charSetting),
		WorldSetting:     strings.TrimSpace(worldSetting),
		PlotIdea:         strings.TrimSpace(plotIdea),
		CreatedAt:        now,
		UpdatedAt:        now,
		Chapters:         []core.Chapter{},
	}

	return project, nil
}

func (pm *ProjectManager) SaveProject(p *core.NovelProject) error {
	db := core.GetDB()
	now := time.Now().Format(time.RFC3339)
	p.UpdatedAt = now

	if p.ID == "" {
		p.ID = core.Slugify(p.Title)
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}

	sgJSON, _ := json.Marshal(p.SubGenres)
	if string(sgJSON) == "null" {
		sgJSON = []byte("[]")
	}

	_, err = tx.Exec(`INSERT INTO projects 
		(id, title, genre, sub_genres, character_setting, world_setting, plot_idea, created_at, updated_at) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
		title=excluded.title,
		genre=excluded.genre,
		sub_genres=excluded.sub_genres,
		character_setting=excluded.character_setting,
		world_setting=excluded.world_setting,
		plot_idea=excluded.plot_idea,
		updated_at=excluded.updated_at`,
		p.ID, p.Title, p.Genre, string(sgJSON), p.CharacterSetting, p.WorldSetting, p.PlotIdea, p.CreatedAt, p.UpdatedAt)

	if err != nil {
		tx.Rollback()
		return err
	}

	_, _ = tx.Exec("DELETE FROM chapters WHERE project_id = ?", p.ID)
	for _, ch := range p.Chapters {
		_, err = tx.Exec(`INSERT INTO chapters 
			(project_id, num, title, desc, content, word_count, generated_at) 
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			p.ID, ch.Num, ch.Title, ch.Desc, ch.Content, ch.WordCount, ch.GeneratedAt)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	err = tx.Commit()
	if err == nil {
		log.Printf("Project saved: %s", p.ID)
	}
	return err
}

func (pm *ProjectManager) LoadProject(id string) (*core.NovelProject, error) {
	db := core.GetDB()
	p := &core.NovelProject{}

	var sgStr string
	err := db.QueryRow("SELECT id, title, genre, sub_genres, character_setting, world_setting, plot_idea, created_at, updated_at FROM projects WHERE id = ?", id).
		Scan(&p.ID, &p.Title, &p.Genre, &sgStr, &p.CharacterSetting, &p.WorldSetting, &p.PlotIdea, &p.CreatedAt, &p.UpdatedAt)
	
	if err != nil {
		return nil, err
	}

	json.Unmarshal([]byte(sgStr), &p.SubGenres)

	rows, err := db.Query("SELECT num, title, desc, content, word_count, generated_at FROM chapters WHERE project_id = ? ORDER BY num", id)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var ch core.Chapter
			var genAt sql.NullString
			if err := rows.Scan(&ch.Num, &ch.Title, &ch.Desc, &ch.Content, &ch.WordCount, &genAt); err == nil {
				if genAt.Valid {
					ch.GeneratedAt = genAt.String
				}
				p.Chapters = append(p.Chapters, ch)
			}
		}
	}

	return p, nil
}

func (pm *ProjectManager) ListProjects() ([]map[string]interface{}, error) {
	db := core.GetDB()
	rows, err := db.Query("SELECT id, title, genre, created_at, updated_at FROM projects ORDER BY updated_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []map[string]interface{}
	for rows.Next() {
		var id, title, genre, ca, ua string
		if err := rows.Scan(&id, &title, &genre, &ca, &ua); err == nil {
			var total, completed int
			db.QueryRow("SELECT COUNT(*) as total, SUM(CASE WHEN content != '' THEN 1 ELSE 0 END) as completed FROM chapters WHERE project_id = ?", id).Scan(&total, &completed)
			
			result = append(result, map[string]interface{}{
				"id": id,
				"title": title,
				"genre": genre,
				"created_at": ca,
				"updated_at": ua,
				"chapter_count": total,
				"completed_chapters": completed,
			})
		}
	}
	return result, nil
}

func (pm *ProjectManager) DeleteProject(id string) error {
	db := core.GetDB()
	res, err := db.Exec("DELETE FROM projects WHERE id = ?", id)
	if err != nil {
		return err
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("project not found")
	}
	log.Printf("Project deleted: %s", id)
	return nil
}
