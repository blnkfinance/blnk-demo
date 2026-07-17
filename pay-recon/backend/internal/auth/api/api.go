package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/blnk-demo/pay-recon/backend/internal/auth"
	"github.com/blnk-demo/pay-recon/backend/internal/auth/model"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc auth.Service
}

func NewHandler(svc auth.Service) *Handler {
	return &Handler{svc: svc}
}

func Mount(r chi.Router, h *Handler) {
	r.Post("/auth/admin/login", h.LoginAdmin)
	r.Get("/auth/validate", h.Validate)
}

func (h *Handler) LoginAdmin(w http.ResponseWriter, r *http.Request) {
	var input model.LoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}

	session, err := h.svc.LoginAdmin(r.Context(), input)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, model.LoginResponse{
		Token: session.Token,
		Role:  session.Role,
	})
}

func (h *Handler) Validate(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
	if token == "" {
		token = strings.TrimSpace(r.URL.Query().Get("token"))
	}
	if token == "" {
		writeErr(w, http.StatusUnauthorized, "missing_token")
		return
	}
	claims, err := h.svc.ValidateToken(r.Context(), token)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":         true,
		"subject_id": claims.SubjectID,
		"role":       claims.Role,
		"expires_at": claims.ExpiresAt,
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErr(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}
