package utils

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

var localeData map[string]interface{}
var customPrompts map[string]map[string]string

func loadCustomPrompts() {
	customPrompts = make(map[string]map[string]string)
	data, err := os.ReadFile("data/prompts.json")
	if err == nil {
		// Try to unmarshal into new format
		if err := json.Unmarshal(data, &customPrompts); err != nil {
			// If failed, try old format map[string]string
			var oldFormat map[string]string
			if json.Unmarshal(data, &oldFormat) == nil {
				customPrompts["Mặc định"] = oldFormat
			}
		}
	}
}

func InitI18n() error {
	loadCustomPrompts()
	path := "locales/VI/messages.json"
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, &localeData)
}

// T retrieves a translated string from messages.json.
// The key should be dot-separated, e.g., "prompts.outline_system".
// You can pass a map[string]interface{} as the second argument to replace variables like {genre}.
func T(key string, args ...map[string]interface{}) string {
	if localeData == nil {
		_ = InitI18n() // Try auto-init
	}
	
	// Determine genre
	genre := "Mặc định"
	if len(args) > 0 && args[0] != nil {
		if g, ok := args[0]["genre"]; ok {
			genre = fmt.Sprintf("%v", g)
		}
	}

	// Check custom prompts first
	if strings.HasPrefix(key, "prompts.") && customPrompts != nil {
		subKey := strings.TrimPrefix(key, "prompts.")
		
		// 1. Try exact genre match
		if genreMap, ok := customPrompts[genre]; ok {
			if val, ok := genreMap[subKey]; ok && val != "" {
				return applyArgs(val, args...)
			}
		}
		
		// 2. Try default match if genre wasn't already default
		if genre != "Mặc định" {
			if defaultMap, ok := customPrompts["Mặc định"]; ok {
				if val, ok := defaultMap[subKey]; ok && val != "" {
					return applyArgs(val, args...)
				}
			}
		}
	}
	
	parts := strings.Split(key, ".")
	var current interface{} = localeData
	for _, part := range parts {
		if m, ok := current.(map[string]interface{}); ok {
			current = m[part]
		} else {
			return key
		}
	}
	
	str, ok := current.(string)
	if !ok {
		return key
	}
	
	return applyArgs(str, args...)
}

func applyArgs(str string, args ...map[string]interface{}) string {
	if len(args) > 0 && args[0] != nil {
		for k, v := range args[0] {
			str = strings.ReplaceAll(str, "{"+k+"}", fmt.Sprintf("%v", v))
		}
	}
	return str
}
