package core

import (
	"io"
	"log"
	"os"
	"path/filepath"
	"time"
)

func InitLogger() {
	// Set local timezone to Vietnam (Asia/Ho_Chi_Minh)
	loc, err := time.LoadLocation("Asia/Ho_Chi_Minh")
	if err == nil {
		time.Local = loc
	}

	logDir := "logs"
	if err := os.MkdirAll(logDir, 0755); err != nil {
		log.Fatalf("Failed to create log directory: %v", err)
	}

	logFile, err := os.OpenFile(filepath.Join(logDir, "leviatech_story.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("Failed to open log file: %v", err)
	}

	mw := io.MultiWriter(os.Stdout, logFile)
	log.SetOutput(mw)
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)
	log.Println("Logger initialized")
}
