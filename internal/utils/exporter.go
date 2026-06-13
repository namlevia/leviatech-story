package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/bmaupin/go-epub"
	"github.com/gomarkdown/markdown"
)

// StripChapterPrefix removes "Chương X: " or "Chương X - " from the title
func StripChapterPrefix(title string) string {
	re := regexp.MustCompile(`^(?i)chương\s+\d+[\s:\.\-]*`)
	res := re.ReplaceAllString(title, "")
	if res == "" {
		return title // Fallback if it was just "Chương X"
	}
	return strings.TrimSpace(res)
}

var ExportDir = os.TempDir()

func sanitizeFilename(name string) string {
	if strings.TrimSpace(name) == "" {
		name = "novel"
	}
	re := regexp.MustCompile(`[<>:"/\\|?*]`)
	safe := re.ReplaceAllString(name, "_")
	safe = strings.TrimSpace(safe)
	if len(safe) > 120 {
		safe = safe[:120]
	}
	return safe
}

type ChapterData struct {
	Title   string
	Content string
}

func CleanChapterContent(content string) string {
	// Removes lines that start with [Hệ thống] even if they have markdown/html formatting
	re := regexp.MustCompile(`(?mi)^[\*\_\s]*(?:<[^>]+>)*\[?(?:hệ thống|system)\]?:?.*$`)
	return strings.TrimSpace(re.ReplaceAllString(content, ""))
}

func ExportToTXT(chapters []ChapterData, title string) (string, error) {
	if len(chapters) == 0 {
		return "", fmt.Errorf("no chapters found")
	}

	var sb strings.Builder
	sb.WriteString(title + "\n\n")
	sb.WriteString("© Bản quyền thuộc về tác giả.\nĐược hỗ trợ sáng tác bởi: LeviaTech Story.\n\n")
	for _, ch := range chapters {
		content := CleanChapterContent(ch.Content)
		sb.WriteString(ch.Title + "\n\n")
		sb.WriteString(content + "\n\n")
		sb.WriteString(strings.Repeat("-", 80) + "\n\n")
	}

	filename := fmt.Sprintf("%s_%s.txt", sanitizeFilename(title), time.Now().Format("20060102_150405"))
	filepath := filepath.Join(ExportDir, filename)

	err := os.WriteFile(filepath, []byte(sb.String()), 0644)
	if err != nil {
		return "", err
	}
	return filepath, nil
}

func ExportToMarkdown(chapters []ChapterData, title string) (string, error) {
	if len(chapters) == 0 {
		return "", fmt.Errorf("no chapters found")
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("# %s\n\n", title))
	sb.WriteString("*© Bản quyền thuộc về tác giả.*\n\n*Được hỗ trợ sáng tác bởi: LeviaTech Story.*\n\n---\n\n")
	for _, ch := range chapters {
		content := CleanChapterContent(ch.Content)
		sb.WriteString(fmt.Sprintf("## %s\n\n%s\n\n", ch.Title, content))
	}

	filename := fmt.Sprintf("%s_%s.md", sanitizeFilename(title), time.Now().Format("20060102_150405"))
	filepath := filepath.Join(ExportDir, filename)

	err := os.WriteFile(filepath, []byte(sb.String()), 0644)
	if err != nil {
		return "", err
	}
	return filepath, nil
}

func ExportToHTML(chapters []ChapterData, title string) (string, error) {
	if len(chapters) == 0 {
		return "", fmt.Errorf("no chapters found")
	}

	var novelText strings.Builder
	for _, ch := range chapters {
		content := CleanChapterContent(ch.Content)
		novelText.WriteString(fmt.Sprintf("## %s\n\n%s\n\n", ch.Title, content))
	}

	htmlContent := markdown.ToHTML([]byte(novelText.String()), nil, nil)

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf(`<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>%s</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.8; background-color: #f5f5f5; color: #333;}
        h1 { text-align: center; font-size: 2.5em; margin-bottom: 0.5em; }
        h2 { text-align: center; font-size: 1.5em; margin-top: 1.5em; margin-bottom: 0.5em; border-bottom: 2px solid #ddd; padding-bottom: 0.3em; }
        p { text-align: justify; text-indent: 2em; margin: 1em 0; }
        .info { text-align: center; color: #999; font-size: 0.9em; }
    </style>
</head>
<body>
    <h1>%s</h1>
    <p class="info">© Bản quyền thuộc về tác giả.<br>Được hỗ trợ sáng tác bởi: LeviaTech Story.</p>
    <hr>
    %s
</body>
</html>`, title, title, string(htmlContent)))

	filename := fmt.Sprintf("%s_%s.html", sanitizeFilename(title), time.Now().Format("20060102_150405"))
	filepath := filepath.Join(ExportDir, filename)

	err := os.WriteFile(filepath, []byte(sb.String()), 0644)
	if err != nil {
		return "", err
	}
	return filepath, nil
}

func ExportToEPUB(chapters []ChapterData, title string) (string, error) {
	if len(chapters) == 0 {
		return "", fmt.Errorf("no chapters found")
	}

	e := epub.NewEpub(title)
	e.SetAuthor("LeviaTech Story")

	for _, ch := range chapters {
		content := CleanChapterContent(ch.Content)
		htmlContent := string(markdown.ToHTML([]byte(content), nil, nil))

		// Replace HTML named entities with unicode to ensure XHTML compatibility in EPUB
		htmlContent = strings.ReplaceAll(htmlContent, "&ldquo;", "“")
		htmlContent = strings.ReplaceAll(htmlContent, "&rdquo;", "”")
		htmlContent = strings.ReplaceAll(htmlContent, "&lsquo;", "‘")
		htmlContent = strings.ReplaceAll(htmlContent, "&rsquo;", "’")
		htmlContent = strings.ReplaceAll(htmlContent, "&hellip;", "…")
		htmlContent = strings.ReplaceAll(htmlContent, "&mdash;", "—")
		htmlContent = strings.ReplaceAll(htmlContent, "&ndash;", "–")
		htmlContent = strings.ReplaceAll(htmlContent, "&nbsp;", "&#160;")

		sectionBody := fmt.Sprintf(`<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6;">
<h1>%s</h1>
%s
</div>`, ch.Title, htmlContent)
		_, err := e.AddSection(sectionBody, ch.Title, "", "")
		if err != nil {
			return "", err
		}
	}

	filename := fmt.Sprintf("%s_%s.epub", sanitizeFilename(title), time.Now().Format("20060102_150405"))
	filepath := filepath.Join(ExportDir, filename)

	err := e.Write(filepath)
	if err != nil {
		return "", err
	}

	return filepath, nil
}
