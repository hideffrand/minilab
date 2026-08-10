package system

import (
	"encoding/json"
	"log"
	"net/http"
)

type Handler struct {
	rootDir string
	confirm *confirmStore
}

func NewHandler(rootDir string) *Handler {
	return &Handler{rootDir: rootDir, confirm: newConfirmStore()}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/system/stats", h.stats)
	mux.HandleFunc("POST /api/system/confirm-token", h.issueToken)
	mux.HandleFunc("POST /api/system/reboot", h.reboot)
	mux.HandleFunc("POST /api/system/shutdown", h.shutdown)
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

func (h *Handler) reboot(w http.ResponseWriter, r *http.Request) {
	h.power(w, r, "reboot")
}

func (h *Handler) shutdown(w http.ResponseWriter, r *http.Request) {
	h.power(w, r, "shutdown")
}

func (h *Handler) issueToken(w http.ResponseWriter, r *http.Request) {
	tok, err := h.confirm.issue()
	if err != nil {
		log.Println("issue confirm token error:", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"token": tok, "expiresInSeconds": "60"})
}

func (h *Handler) power(w http.ResponseWriter, r *http.Request, action string) {
	// Require a confirm token fetched right before the call (see the app's
	// biometric gate): a leaked API key or a replayed request alone can't
	// reboot or shut down the machine.
	if !h.confirm.consume(r.Header.Get("X-Confirm-Token")) {
		writeJSON(w, http.StatusForbidden, map[string]string{
			"error": "missing or expired confirm token; request a fresh one first",
		})
		return
	}
	// Detached from the request: if the phone drops the connection mid-reboot,
	// the command must still run.
	if err := runPower(action); err != nil {
		log.Printf("power %s error: %v", action, err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "power control failed. Grant passwordless sudo for systemctl reboot/poweroff (see install.sh), or run this on a machine with a local session.",
		})
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "ok"})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
