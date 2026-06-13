package utils

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

var localeData map[string]interface{}

func InitI18n() error {
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
	
	if len(args) > 0 && args[0] != nil {
		for k, v := range args[0] {
			str = strings.ReplaceAll(str, "{"+k+"}", fmt.Sprintf("%v", v))
		}
	}
	
	return str
}
