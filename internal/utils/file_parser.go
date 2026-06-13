package utils

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/ledongthuc/pdf"
)

func ParseFile(filePath string) (string, error) {
	ext := strings.ToLower(filepath.Ext(filePath))
	switch ext {
	case ".txt", ".md":
		return parseTextFile(filePath)
	case ".pdf":
		return parsePDFFile(filePath)
	case ".docx":
		return parseDOCXFile(filePath)
	case ".epub":
		return parseEPUBFile(filePath)
	default:
		return "", fmt.Errorf("unsupported file format: %s", ext)
	}
}

func parseTextFile(filePath string) (string, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func parsePDFFile(filePath string) (string, error) {
	f, r, err := pdf.Open(filePath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	var sb strings.Builder
	totalPage := r.NumPage()

	for pageIndex := 1; pageIndex <= totalPage; pageIndex++ {
		p := r.Page(pageIndex)
		if p.V.IsNull() {
			continue
		}
		
		content, err := p.GetPlainText(nil)
		if err == nil {
			sb.WriteString(content)
			sb.WriteString("\n")
		}
	}
	return sb.String(), nil
}

func parseDOCXFile(filePath string) (string, error) {
	// DOCX is a zip file, text is in word/document.xml
	r, err := zip.OpenReader(filePath)
	if err != nil {
		return "", err
	}
	defer r.Close()

	var xmlContent string
	for _, f := range r.File {
		if f.Name == "word/document.xml" {
			rc, err := f.Open()
			if err != nil {
				return "", err
			}
			data, _ := io.ReadAll(rc)
			rc.Close()
			xmlContent = string(data)
			break
		}
	}

	if xmlContent == "" {
		return "", fmt.Errorf("invalid docx file: word/document.xml not found")
	}

	// Simple xml parsing: replace </w:p> with newline, strip other tags
	xmlContent = strings.ReplaceAll(xmlContent, "</w:p>", "\n")
	reTags := regexp.MustCompile(`<[^>]*>`)
	text := reTags.ReplaceAllString(xmlContent, "")

	return text, nil
}

func parseEPUBFile(filePath string) (string, error) {
	// EPUB is a zip file, text is in .html, .htm, .xhtml files
	r, err := zip.OpenReader(filePath)
	if err != nil {
		return "", err
	}
	defer r.Close()

	var sb strings.Builder
	for _, f := range r.File {
		ext := strings.ToLower(filepath.Ext(f.Name))
		if ext == ".html" || ext == ".htm" || ext == ".xhtml" {
			rc, err := f.Open()
			if err != nil {
				continue
			}
			data, _ := io.ReadAll(rc)
			rc.Close()

			content := string(data)
			// Naive HTML to text: replace block elements with newlines
			content = regexp.MustCompile(`(?i)<(?:p|div|h[1-6]|br|li)[^>]*>`).ReplaceAllString(content, "\n")
			content = regexp.MustCompile(`(?i)</(?:p|div|h[1-6]|br|li)>`).ReplaceAllString(content, "\n")
			content = regexp.MustCompile(`<[^>]*>`).ReplaceAllString(content, "")
			
			// Unescape HTML entities
			content = strings.ReplaceAll(content, "&nbsp;", " ")
			content = strings.ReplaceAll(content, "&lt;", "<")
			content = strings.ReplaceAll(content, "&gt;", ">")
			content = strings.ReplaceAll(content, "&amp;", "&")

			sb.WriteString(content)
			sb.WriteString("\n\n")
		}
	}

	return sb.String(), nil
}
