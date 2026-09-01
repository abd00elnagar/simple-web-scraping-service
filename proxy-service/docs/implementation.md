# Proxy Service Implementation Guide

## 1. Directory Structure

```
proxy-service/
├── docs/
│   ├── implementation.md   # Implementation documentation (this file)
│   └── plan.md             # Architecture design document
├── go.mod                  # Module definition
├── main.go                 # HTTP server, identity pool, and round-robin logic
└── main_test.go            # Concurrency & rotation unit test suite
```

---

## 2. Code Implementation Details (`main.go`)

### 2.1 Struct Definitions
```go
type Headers struct {
    UserAgent      string `json:"User-Agent"`
    Accept         string `json:"Accept"`
    AcceptLanguage string `json:"Accept-Language"`
    SecFetchMode   string `json:"Sec-Fetch-Mode"`
}

type Identity struct {
    ProxyLabel string  `json:"proxy_label"`
    Headers    Headers `json:"headers"`
}
```

### 2.2 Thread-Safe Rotator
```go
type IdentityRotator struct {
    mu      sync.Mutex
    counter uint64
}

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
```

### 2.3 HTTP Endpoint Handler
Mounted at `GET /next-identity`:
- Responds with `200 OK` and Content-Type `application/json`.
- Disallows non-GET methods (`405 Method Not Allowed`).
- Logs each served request with timestamp and User-Agent snippet to stdout for monitoring.

---

## 3. Running & Testing

### Run Server:
```bash
cd proxy-service
go run main.go
```
Starts on `http://localhost:9000`.

### Run Unit Tests:
```bash
go test -v ./...
```
Tests:
- Correct sequential round-robin rotation.
- Concurrency safety under high parallel goroutine load.
