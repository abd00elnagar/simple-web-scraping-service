# Proxy Service Architecture & Technical Specification

## 1. Overview
`proxy-service` is a standalone, lightweight microservice written in Golang using exclusively the standard library. Its sole responsibility is to provide rotating User-Agent headers and simulated proxy labels to downstream scraping services over HTTP.

---

## 2. Technical Stack
- **Language**: Go 1.27+
- **Framework/Dependencies**: None (Go standard library only: `net/http`, `encoding/json`, `sync`, `log`, `fmt`)
- **Port**: `9000`

---

## 3. Data Structures & Identity Pool

### 3.1 Simulated Proxy Labels
5 simulated proxies labeled explicitly:
- `proxy-1`
- `proxy-2`
- `proxy-3`
- `proxy-4`
- `proxy-5`

### 3.2 Realistic User-Agent Pool (~10 User-Agents)
1. Chrome on Windows 11
2. Chrome on macOS
3. Firefox on Windows
4. Firefox on Linux
5. Safari on macOS
6. Safari on iPhone (iOS)
7. Chrome on Android (Pixel 8)
8. Edge on Windows 11
9. Opera on Windows 10
10. Firefox on macOS

---

## 4. API Specification

### Endpoint: `GET /next-identity`
- **Method**: `GET`
- **Path**: `/next-identity`
- **Response Content-Type**: `application/json`
- **Status Code**: `200 OK`

#### Response Body Schema
```json
{
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "proxy_label": "proxy-1"
}
```

---

## 5. Round-Robin & Concurrency Control
HTTP request handlers in Go execute concurrently in separate goroutines. To guarantee thread-safe round-robin selection:
- Maintain an internal `counter` integer.
- Protect state mutations using `sync.Mutex` (or `sync/atomic`).
- Calculate index: `index = counter % pool_size`.

---

## 6. Observability & stdout Logging
For each incoming request to `/next-identity`, log a formatted entry to stdout:
```
[PROXY-SERVICE] 2026/08/31 21:30:00 Served Identity #3 -> Proxy: proxy-3 | UA: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...
```

---

## 7. Verification Steps
1. Run server: `go run main.go`
2. Test rotation: `curl -s http://localhost:9000/next-identity`
3. Verify sequential round-robin outputs and stdout logging.
