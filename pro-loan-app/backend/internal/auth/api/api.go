package api

import (
	"encoding/json"
	"net/http"

	"github.com/blnk-demo/pro-loan-app/backend/internal/auth"
	"github.com/blnk-demo/pro-loan-app/backend/internal/auth/model"
)

type Handler struct {
	svc auth.Service
}

func NewHandler(svc auth.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) LoginAdmin(w http.ResponseWriter, r *http.Request) {
	var input model.LoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}

	session, err := h.svc.LoginAdmin(r.Context(), input)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "invalid_credentials")
		return
	}

	writeJSON(w, http.StatusOK, session)
}

func (h *Handler) LoginCustomer(w http.ResponseWriter, r *http.Request) {
	var input model.LoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}

	session, err := h.svc.LoginCustomer(r.Context(), input)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "invalid_credentials")
		return
	}

	writeJSON(w, http.StatusOK, session)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
