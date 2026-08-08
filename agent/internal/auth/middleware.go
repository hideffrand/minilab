package auth

import (
	"crypto/subtle"
	"net/http"
)

// RequireAPIKey wraps a handler and rejects requests that don't present
// the correct API key in the "X-API-Key" header. Uses constant-time
// comparison to avoid timing attacks.
func RequireAPIKey(apiKey string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		provided := r.Header.Get("X-API-Key")
		if provided == "" || subtle.ConstantTimeCompare([]byte(provided), []byte(apiKey)) != 1 {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}
