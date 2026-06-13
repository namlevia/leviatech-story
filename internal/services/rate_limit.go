package services

import (
	"sync"
	"time"
)

type RateLimiter struct {
	rate       float64
	window     float64
	tokens     float64
	lastUpdate time.Time
	mu         sync.Mutex
}

func NewRateLimiter(rate float64, window float64) *RateLimiter {
	return &RateLimiter{
		rate:       rate,
		window:     window,
		tokens:     rate,
		lastUpdate: time.Now(),
	}
}

func (r *RateLimiter) Acquire(tokens float64, blocking bool) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(r.lastUpdate).Seconds()

	r.tokens += elapsed * (r.rate / r.window)
	if r.tokens > r.rate {
		r.tokens = r.rate
	}
	r.lastUpdate = now

	if r.tokens >= tokens {
		r.tokens -= tokens
		return true
	}

	if blocking {
		waitTime := (tokens - r.tokens) * r.window / r.rate
		time.Sleep(time.Duration(waitTime * float64(time.Second)))
		r.tokens = 0
		r.lastUpdate = time.Now()
		return true
	}

	return false
}
