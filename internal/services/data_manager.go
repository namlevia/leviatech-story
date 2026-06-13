package services

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"sync"
)

type DataItem struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type DataManager struct {
	fileName string
	cache    []DataItem
	mu       sync.RWMutex
}

func NewDataManager(fileName string) *DataManager {
	return &DataManager{
		fileName: fileName,
	}
}

func (dm *DataManager) getFilePath() string {
	return filepath.Join("data", dm.fileName)
}

func (dm *DataManager) Load() ([]DataItem, error) {
	dm.mu.RLock()
	if dm.cache != nil {
		defer dm.mu.RUnlock()
		return dm.cache, nil
	}
	dm.mu.RUnlock()

	dm.mu.Lock()
	defer dm.mu.Unlock()

	path := dm.getFilePath()
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return []DataItem{}, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var items []DataItem
	if err := json.Unmarshal(data, &items); err != nil {
		return nil, err
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].Name < items[j].Name
	})

	dm.cache = items
	return items, nil
}

func (dm *DataManager) Save(items []DataItem) error {
	dm.mu.Lock()
	defer dm.mu.Unlock()

	sort.Slice(items, func(i, j int) bool {
		return items[i].Name < items[j].Name
	})

	path := dm.getFilePath()
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(items, "", "    ")
	if err != nil {
		return err
	}

	if err := os.WriteFile(path, data, 0644); err != nil {
		return err
	}

	dm.cache = items
	return nil
}

func FormatDataWithDesc(fileName, name string) string {
	if name == "" {
		return ""
	}
	path := filepath.Join("data", fileName)
	data, err := os.ReadFile(path)
	if err != nil {
		return name
	}
	var items []DataItem
	if err := json.Unmarshal(data, &items); err != nil {
		return name
	}
	for _, item := range items {
		if item.Name == name && item.Description != "" {
			return fmt.Sprintf("%s (%s)", item.Name, item.Description)
		}
	}
	return name
}

func (dm *DataManager) Add(item DataItem) error {
	items, err := dm.Load()
	if err != nil {
		return err
	}

	for _, existing := range items {
		if existing.Name == item.Name {
			return fmt.Errorf("item already exists")
		}
	}

	items = append(items, item)
	return dm.Save(items)
}

func (dm *DataManager) Update(oldName string, newItem DataItem) error {
	items, err := dm.Load()
	if err != nil {
		return err
	}

	for i, existing := range items {
		if existing.Name == oldName {
			if oldName != newItem.Name {
				for _, check := range items {
					if check.Name == newItem.Name {
						return fmt.Errorf("new name already exists")
					}
				}
			}
			items[i] = newItem
			return dm.Save(items)
		}
	}

	return fmt.Errorf("item not found")
}

func (dm *DataManager) Delete(name string) error {
	items, err := dm.Load()
	if err != nil {
		return err
	}

	for i, existing := range items {
		if existing.Name == name {
			items = append(items[:i], items[i+1:]...)
			return dm.Save(items)
		}
	}

	return fmt.Errorf("item not found")
}

func (dm *DataManager) GetDescription(name string) string {
	items, err := dm.Load()
	if err != nil {
		return ""
	}
	for _, item := range items {
		if item.Name == name {
			return item.Description
		}
	}
	return ""
}

var (
	GenreManager    = NewDataManager("genres.json")
	SubGenreManager = NewDataManager("sub_genres.json")
	StyleManager    = NewDataManager("writing_styles.json")
	ToneManager     = NewDataManager("tones.json")
	PovManager      = NewDataManager("pov.json")
	PronounManager  = NewDataManager("pronouns.json")
)
