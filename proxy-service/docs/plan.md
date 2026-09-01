# Proxy Service Architecture & Technical Specification

## 1. Overview
The `proxy-service` is a lightweight, standalone Golang microservice running on port `9000`. Its responsibility is to manage and rotate simulated proxy labels and realistic browser fingerprint headers (`User-Agent`, `Accept`, `Accept-Language`, `Sec-Fetch-Mode`) to support downstream scraping operations.

---

## 2. Technical Stack
- **Language**: Go 1.21+ / standard library only (`net/http`, `encoding/json`, `sync`, `log`, `fmt`)
- **Port**: `9000`
- **Dependencies**: Zero external dependencies

---

## 3. Data Structures & Identity Pool

### 3.1 Simulated Proxy Labels
- 5 rotating labels: `proxy-1`, `proxy-2`, `proxy-3`, `proxy-4`, `proxy-5`.

### 3.2 Realistic Browser Header Profiles (10 Fingerprints)
1. Chrome on Windows 11
2. Chrome on macOS Sonoma
3. Firefox on Windows 11
4. Firefox on Linux (Ubuntu/Debian)
5. Safari on macOS Sonoma
6. Safari on iPhone (iOS 17)
7. Chrome on Android (Pixel 8)
8. Microsoft Edge on Windows 11
9. Opera on Windows 10
10. Firefox on macOS

---

## 4. API Specification

### Endpoint: `GET /next-identity`
- **Response**: `200 OK (application/json)`
```json
{
  "proxy_label": "proxy-1",
  "headers": {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Mode": "navigate"
  }
}
```

---

## 5. Concurrency & Thread Safety
- Uses `sync.Mutex` inside `IdentityRotator` to guard counter incrementing and array indexing across concurrent HTTP requests.
