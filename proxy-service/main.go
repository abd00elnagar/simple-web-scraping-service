package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
)

// Headers represents a full set of browser-like request headers.
type Headers struct {
	UserAgent      string `json:"User-Agent"`
	Accept         string `json:"Accept"`
	AcceptLanguage string `json:"Accept-Language"`
	SecFetchMode   string `json:"Sec-Fetch-Mode"`
}

// Identity is the rotated proxy identity served to downstream scrapers.
type Identity struct {
	ProxyLabel string  `json:"proxy_label"`
	Headers    Headers `json:"headers"`
}

// userAgentProfiles contains realistic browser header sets.
// Each entry represents a distinct browser + OS fingerprint combination.
var userAgentProfiles = []Headers{
	{
		UserAgent:      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
		Accept:         "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
		AcceptLanguage: "en-US,en;q=0.9",
		SecFetchMode:   "navigate",
	},
	{
		UserAgent:      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
		Accept:         "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
		AcceptLanguage: "en-US,en;q=0.9",
		SecFetchMode:   "navigate",
	},
	{
		UserAgent:      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0",
		Accept:         "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
		AcceptLanguage: "en-US,en;q=0.5",
		SecFetchMode:   "navigate",
	},
	{
		UserAgent:      "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
		Accept:         "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
		AcceptLanguage: "en-US,en;q=0.5",
		SecFetchMode:   "navigate",
	},
	{
		UserAgent:      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
		Accept:         "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		AcceptLanguage: "en-US,en;q=0.9",
		SecFetchMode:   "navigate",
	},
	{
		UserAgent:      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		Accept:         "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		AcceptLanguage: "en-US,en;q=0.9",
		SecFetchMode:   "navigate",
	},
	{
		UserAgent:      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.122 Mobile Safari/537.36",
		Accept:         "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
		AcceptLanguage: "en-US,en;q=0.9",
		SecFetchMode:   "navigate",
	},
	{
		UserAgent:      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
		Accept:         "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
		AcceptLanguage: "en-US,en;q=0.9",
		SecFetchMode:   "navigate",
	},
	{
		UserAgent:      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 OPR/113.0.0.0",
		Accept:         "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
		AcceptLanguage: "en-US,en;q=0.9",
		SecFetchMode:   "navigate",
	},
	{
		UserAgent:      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0",
		Accept:         "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
		AcceptLanguage: "en-US,en;q=0.5",
		SecFetchMode:   "navigate",
	},
}

// Simulated proxy labels (Note: these are label identifiers only — no real proxy IPs are used).
var proxies = []string{
	"proxy-1",
	"proxy-2",
	"proxy-3",
	"proxy-4",
	"proxy-5",
}

// IdentityRotator provides thread-safe round-robin identity selection.
type IdentityRotator struct {
	mu      sync.Mutex
	counter uint64
}

func NewIdentityRotator() *IdentityRotator {
	return &IdentityRotator{}
}

// Next returns the next round-robin identity with full browser headers.
func (r *IdentityRotator) Next() Identity {
	r.mu.Lock()
	defer r.mu.Unlock()

	profileIndex := int(r.counter % uint64(len(userAgentProfiles)))
	proxyIndex := int(r.counter % uint64(len(proxies)))
	r.counter++

	return Identity{
		ProxyLabel: proxies[proxyIndex],
		Headers:    userAgentProfiles[profileIndex],
	}
}

func main() {
	rotator := NewIdentityRotator()

	http.HandleFunc("/next-identity", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		identity := rotator.Next()

		log.Printf("[PROXY-SERVICE] Served Identity -> Proxy: %s | User-Agent: %s",
			identity.ProxyLabel, identity.Headers.UserAgent)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(identity); err != nil {
			log.Printf("[PROXY-SERVICE] Error encoding JSON: %v", err)
		}
	})

	port := ":9000"
	fmt.Printf("[PROXY-SERVICE] Server running on http://localhost%s\n", port)
	log.Fatal(http.ListenAndServe(port, nil))
}
