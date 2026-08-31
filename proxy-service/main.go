package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
)

// Identity represents the rotated proxy identity response structure.
type Identity struct {
	UserAgent  string `json:"user_agent"`
	ProxyLabel string `json:"proxy_label"`
}

// UserAgent pool featuring ~10 realistic modern browser user agents across OS platform types.
var userAgents = []string{
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0",
	"Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
	"Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.122 Mobile Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 OPR/113.0.0.0",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0",
}

// Simulated proxy labels pool (Note: These represent simulated proxy nodes for demonstration).
var proxies = []string{
	"proxy-1",
	"proxy-2",
	"proxy-3",
	"proxy-4",
	"proxy-5",
}

// IdentityRotator handles thread-safe round-robin identity rotation.
type IdentityRotator struct {
	mu      sync.Mutex
	counter uint64
}

func NewIdentityRotator() *IdentityRotator {
	return &IdentityRotator{}
}

// Next returns the next round-robin identity.
func (r *IdentityRotator) Next() Identity {
	r.mu.Lock()
	defer r.mu.Unlock()

	uaIndex := int(r.counter % uint64(len(userAgents)))
	proxyIndex := int(r.counter % uint64(len(proxies)))
	r.counter++

	return Identity{
		UserAgent:  userAgents[uaIndex],
		ProxyLabel: proxies[proxyIndex],
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

		log.Printf("[PROXY-SERVICE] Served Identity -> Proxy: %s | User-Agent: %s", identity.ProxyLabel, identity.UserAgent)

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
