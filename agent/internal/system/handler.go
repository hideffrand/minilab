package system

import (
	"encoding/json"
	"log"
	"net/http"
)

type Handler struct {
	rootDir string
}

func NewHandler(rootDir string) *Handler {
	return &Handler{rootDir: rootDir}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/system/stats", h.stats)
}

func (h *Handler) stats(w http.ResponseWriter, r *http.Request) {
	s, err := Collect(h.rootDir)
	if err != nil {
		log.Println("system stats error:", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
		return
	}
	writeJSON(w, http.StatusOK, s)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
