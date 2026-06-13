package core

import (
	"regexp"
	"strings"
)

type Chapter struct {
	Num         int    `json:"num"`
	Title       string `json:"title"`
	Desc        string `json:"desc"`
	Content     string `json:"content"`
	WordCount   int    `json:"word_count"`
	GeneratedAt string `json:"generated_at"`
}

type NovelProject struct {
	ID               string    `json:"id"`
	Title            string    `json:"title"`
	Genre            string    `json:"genre"`
	SubGenres        []string  `json:"sub_genres"`
	Pov              string    `json:"pov"`
	Pronouns         string    `json:"pronouns"`
	CharacterSetting string    `json:"character_setting"`
	WorldSetting     string    `json:"world_setting"`
	PlotIdea         string    `json:"plot_idea"`
	CreatedAt        string    `json:"created_at"`
	UpdatedAt        string    `json:"updated_at"`
	Chapters         []Chapter `json:"chapters"`
}

func Slugify(name string) string {
	s := strings.ToLower(name)
	re1 := regexp.MustCompile(`[^\w\s-]`)
	s = re1.ReplaceAllString(s, "")
	re2 := regexp.MustCompile(`[\s_]+`)
	s = re2.ReplaceAllString(s, "-")
	re3 := regexp.MustCompile(`-+`)
	s = re3.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		return "untitled"
	}
	return s
}
