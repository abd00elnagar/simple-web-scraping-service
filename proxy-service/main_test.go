package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNextIdentityHandler(t *testing.T) {
	rotator := NewIdentityRotator()

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		identity := rotator.Next()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(identity)
	})

	// Test 1: First request — check schema and proxy label
	req1 := httptest.NewRequest(http.MethodGet, "/next-identity", nil)
	rec1 := httptest.NewRecorder()
	handler.ServeHTTP(rec1, req1)

	if rec1.Code != http.StatusOK {
		t.Fatalf("expected status 200 OK, got %d", rec1.Code)
	}

	var res1 Identity
	if err := json.NewDecoder(rec1.Body).Decode(&res1); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if res1.ProxyLabel != "proxy-1" {
		t.Errorf("expected proxy-1, got %s", res1.ProxyLabel)
	}
	if res1.Headers.UserAgent == "" {
		t.Error("expected non-empty User-Agent")
	}
	if res1.Headers.SecFetchMode != "navigate" {
		t.Errorf("expected Sec-Fetch-Mode=navigate, got %s", res1.Headers.SecFetchMode)
	}

	// Test 2: Second request — verify rotation
	req2 := httptest.NewRequest(http.MethodGet, "/next-identity", nil)
	rec2 := httptest.NewRecorder()
	handler.ServeHTTP(rec2, req2)

	var res2 Identity
	_ = json.NewDecoder(rec2.Body).Decode(&res2)

	if res2.ProxyLabel != "proxy-2" {
		t.Errorf("expected proxy-2, got %s", res2.ProxyLabel)
	}
	if res2.Headers.UserAgent == res1.Headers.UserAgent {
		t.Error("expected different User-Agent on second rotation")
	}
}

func TestMethodNotAllowed(t *testing.T) {
	rotator := NewIdentityRotator()

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		identity := rotator.Next()
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(identity)
	})

	req := httptest.NewRequest(http.MethodPost, "/next-identity", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", rec.Code)
	}
}
