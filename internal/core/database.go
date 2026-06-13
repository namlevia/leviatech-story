package core

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"sync"

	_ "modernc.org/sqlite"
)

var (
	dbInstance *sql.DB
	dbOnce     sync.Once
)

func GetDB() *sql.DB {
	dbOnce.Do(func() {
		dbDir := "data"
		if err := os.MkdirAll(dbDir, 0755); err != nil {
			log.Fatalf("Failed to create database directory: %v", err)
		}

		dbPath := filepath.Join(dbDir, "leviatech_story.db")
		db, err := sql.Open("sqlite", dbPath+"?_journal_mode=WAL&_foreign_keys=on")
		if err != nil {
			log.Fatalf("Failed to connect to database: %v", err)
		}

		initDB(db)
		dbInstance = db
		log.Printf("Database connected: %s", dbPath)
	})
	return dbInstance
}

func initDB(db *sql.DB) {
	query := `
	CREATE TABLE IF NOT EXISTS config (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS backends (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		type TEXT NOT NULL,
		base_url TEXT NOT NULL,
		api_key TEXT NOT NULL DEFAULT '',
		model TEXT NOT NULL DEFAULT '',
		enabled INTEGER NOT NULL DEFAULT 1,
		timeout INTEGER NOT NULL DEFAULT 30,
		retry_times INTEGER NOT NULL DEFAULT 3,
		is_default INTEGER NOT NULL DEFAULT 0,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS config_backups (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		data TEXT NOT NULL,
		created_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS response_cache (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL,
		timestamp TEXT NOT NULL,
		ttl INTEGER NOT NULL DEFAULT 3600
	);

	CREATE TABLE IF NOT EXISTS generation_cache (
		project_id TEXT PRIMARY KEY,
		data TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS chapter_summaries (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		project_id TEXT NOT NULL,
		chapter_num INTEGER NOT NULL,
		summary TEXT NOT NULL,
		generated_at TEXT NOT NULL,
		UNIQUE(project_id, chapter_num)
	);

	CREATE TABLE IF NOT EXISTS projects (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		genre TEXT NOT NULL DEFAULT '',
		sub_genres TEXT NOT NULL DEFAULT '[]',
		pov TEXT NOT NULL DEFAULT '',
		pronouns TEXT NOT NULL DEFAULT '',
		character_setting TEXT NOT NULL DEFAULT '',
		world_setting TEXT NOT NULL DEFAULT '',
		plot_idea TEXT NOT NULL DEFAULT '',
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS chapters (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		project_id TEXT NOT NULL,
		num INTEGER NOT NULL,
		title TEXT NOT NULL DEFAULT '',
		desc TEXT NOT NULL DEFAULT '',
		content TEXT NOT NULL DEFAULT '',
		word_count INTEGER NOT NULL DEFAULT 0,
		generated_at TEXT,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
		UNIQUE(project_id, num)
	);

	CREATE TABLE IF NOT EXISTS lore_entries (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		project_id TEXT NOT NULL,
		name TEXT NOT NULL,
		category TEXT NOT NULL,
		keywords TEXT NOT NULL DEFAULT '',
		content TEXT NOT NULL,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);
	`
	_, err := db.Exec(query)
	if err != nil {
		log.Fatalf("Failed to initialize database tables: %v", err)
	}

	// Try to alter table, ignore error if column already exists
	_, _ = db.Exec("ALTER TABLE projects ADD COLUMN sub_genres TEXT NOT NULL DEFAULT '[]'")
	_, _ = db.Exec("ALTER TABLE projects ADD COLUMN pov TEXT NOT NULL DEFAULT ''")
	_, _ = db.Exec("ALTER TABLE projects ADD COLUMN pronouns TEXT NOT NULL DEFAULT ''")
}
