package core

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"
)

type Backend struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	Type       string `json:"type"`
	BaseURL    string `json:"base_url"`
	APIKey     string `json:"api_key"`
	Model      string `json:"model"`
	Enabled    bool   `json:"enabled"`
	Timeout    int    `json:"timeout"`
	RetryTimes int    `json:"retry_times"`
	IsDefault  bool   `json:"is_default"`
}

type GenerationConfig struct {
	Temperature          float64 `json:"temperature"`
	TopP                 float64 `json:"top_p"`
	TopK                 int     `json:"top_k"`
	MaxTokens            int     `json:"max_tokens"`
	ChapterTargetWords   int     `json:"chapter_target_words"`
	WritingStyle         string  `json:"writing_style"`
	WritingTone          string  `json:"writing_tone"`
	Pov                  string  `json:"pov"`
	Pronouns             string  `json:"pronouns"`
	CharacterDevelopment string  `json:"character_development"`
	PlotComplexity       string  `json:"plot_complexity"`
}

type ConfigManager struct {
	Backends     []Backend
	Generation   GenerationConfig
	Version      string
	LastModified string
	sync.RWMutex
}

var (
	configInstance *ConfigManager
	configOnce     sync.Once
)

func GetConfig() *ConfigManager {
	configOnce.Do(func() {
		configInstance = &ConfigManager{
			Version: "4.0.0",
		}
		configInstance.Load()
	})
	return configInstance
}

func (c *ConfigManager) Load() {
	c.Lock()
	defer c.Unlock()

	db := GetDB()
	
	// Load Backends
	rows, err := db.Query("SELECT id, name, type, base_url, api_key, model, enabled, timeout, retry_times, is_default FROM backends ORDER BY id")
	if err == nil {
		defer rows.Close()
		var backends []Backend
		for rows.Next() {
			var b Backend
			var enabled, isDefault int
			if err := rows.Scan(&b.ID, &b.Name, &b.Type, &b.BaseURL, &b.APIKey, &b.Model, &enabled, &b.Timeout, &b.RetryTimes, &isDefault); err == nil {
				b.Enabled = enabled == 1
				b.IsDefault = isDefault == 1
				backends = append(backends, b)
			}
		}
		if len(backends) > 0 {
			c.Backends = backends
		}
	}

	// Load Generation
	var genJSON string
	err = db.QueryRow("SELECT value FROM config WHERE key = 'generation'").Scan(&genJSON)
	if err == nil {
		json.Unmarshal([]byte(genJSON), &c.Generation)
	}

	// Load Version
	db.QueryRow("SELECT value FROM config WHERE key = 'version'").Scan(&c.Version)
	db.QueryRow("SELECT value FROM config WHERE key = 'last_modified'").Scan(&c.LastModified)

	// Defaults if empty
	if len(c.Backends) == 0 {
		c.initDefault()
	}
}

func (c *ConfigManager) initDefault() {
	c.Backends = []Backend{
		{
			Name:       "Default Local",
			Type:       "ollama",
			BaseURL:    "http://localhost:11434/v1",
			APIKey:     "ollama",
			Model:      "llama3.1:latest",
			Enabled:    true,
			Timeout:    120,
			RetryTimes: 3,
			IsDefault:  true,
		},
	}
	c.Generation = GenerationConfig{
		Temperature:          0.7,
		TopP:                 0.9,
		TopK:                 40,
		MaxTokens:            16384,
		ChapterTargetWords:   4000,
		WritingStyle:         "Trôi chảy tự nhiên, tình tiết chặt chẽ, miêu tả nhân vật tinh tế",
		WritingTone:          "Trung lập",
		Pov:                  "Ngôi thứ 3 hạn chế",
		Pronouns:             "Anime / Light Novel",
		CharacterDevelopment: "Chi tiết",
		PlotComplexity:       "Trung bình",
	}
	c.Save()
}

func (c *ConfigManager) Save() error {
	db := GetDB()
	now := time.Now().Format(time.RFC3339)

	tx, err := db.Begin()
	if err != nil {
		return err
	}

	// Backup old config
	backupData := map[string]interface{}{
		"version":       c.Version,
		"last_modified": c.LastModified,
		"backends":      c.Backends,
		"generation":    c.Generation,
	}
	backupJSON, _ := json.Marshal(backupData)
	_, _ = tx.Exec("INSERT INTO config_backups (data, created_at) VALUES (?, ?)", string(backupJSON), now)

	// Save backends
	_, _ = tx.Exec("DELETE FROM backends")
	for _, b := range c.Backends {
		enabled := 0
		if b.Enabled {
			enabled = 1
		}
		isDefault := 0
		if b.IsDefault {
			isDefault = 1
		}
		_, err := tx.Exec(`INSERT INTO backends 
			(name, type, base_url, api_key, model, enabled, timeout, retry_times, is_default, created_at, updated_at) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			b.Name, b.Type, b.BaseURL, b.APIKey, b.Model, enabled, b.Timeout, b.RetryTimes, isDefault, now, now)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	// Save generation
	genJSON, _ := json.Marshal(c.Generation)
	_, _ = tx.Exec("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)", "generation", string(genJSON), now)
	
	c.LastModified = now
	_, _ = tx.Exec("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)", "version", c.Version, now)
	_, _ = tx.Exec("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)", "last_modified", c.LastModified, now)

	err = tx.Commit()
	if err == nil {
		log.Println("Config saved to database")
	}
	return err
}

func (c *ConfigManager) GetEnabledBackends() []Backend {
	c.RLock()
	defer c.RUnlock()
	var enabled []Backend
	for _, b := range c.Backends {
		if b.Enabled {
			enabled = append(enabled, b)
		}
	}
	return enabled
}

func (c *ConfigManager) AddBackend(b Backend) error {
	c.Lock()
	defer c.Unlock()

	for _, existing := range c.Backends {
		if existing.Name == b.Name {
			return fmt.Errorf("backend name exists")
		}
	}

	if len(c.Backends) == 0 {
		b.IsDefault = true
	} else if b.IsDefault {
		for i := range c.Backends {
			c.Backends[i].IsDefault = false
		}
	}

	c.Backends = append(c.Backends, b)
	return c.Save()
}

func (c *ConfigManager) UpdateGenerationConfig(updates map[string]interface{}) error {
	c.Lock()
	defer c.Unlock()

	// Parse JSON
	b, err := json.Marshal(updates)
	if err != nil {
		return err
	}
	
	// Unmarshal into current Generation
	if err := json.Unmarshal(b, &c.Generation); err != nil {
		return err
	}

	return c.Save()
}


func (c *ConfigManager) UpdateBackend(name string, updates map[string]interface{}) error {
	c.Lock()
	defer c.Unlock()

	var found bool
	for i, b := range c.Backends {
		if b.Name == name {
			found = true
			if v, ok := updates["enabled"].(bool); ok {
				c.Backends[i].Enabled = v
			}
			if v, ok := updates["api_key"].(string); ok {
				c.Backends[i].APIKey = v
			}
			if v, ok := updates["base_url"].(string); ok {
				c.Backends[i].BaseURL = v
			}
			if v, ok := updates["model"].(string); ok {
				c.Backends[i].Model = v
			}
			if v, ok := updates["timeout"].(float64); ok {
				c.Backends[i].Timeout = int(v)
			}
			if v, ok := updates["retry_times"].(float64); ok {
				c.Backends[i].RetryTimes = int(v)
			}
			break
		}
	}

	if !found {
		return fmt.Errorf("backend not found")
	}
	return c.Save()
}

func (c *ConfigManager) DeleteBackend(name string) error {
	c.Lock()
	defer c.Unlock()

	idx := -1
	for i, b := range c.Backends {
		if b.Name == name {
			idx = i
			break
		}
	}

	if idx == -1 {
		return fmt.Errorf("backend not found")
	}

	isDefault := c.Backends[idx].IsDefault
	c.Backends = append(c.Backends[:idx], c.Backends[idx+1:]...)

	if isDefault && len(c.Backends) > 0 {
		c.Backends[0].IsDefault = true
	}

	return c.Save()
}

func (c *ConfigManager) SetDefaultBackend(name string) error {
	c.Lock()
	defer c.Unlock()

	var found bool
	for i, b := range c.Backends {
		if b.Name == name {
			found = true
			c.Backends[i].IsDefault = true
			c.Backends[i].Enabled = true // Auto enable when set to default
		} else {
			c.Backends[i].IsDefault = false
		}
	}

	if !found {
		return fmt.Errorf("backend not found")
	}
	return c.Save()
}
