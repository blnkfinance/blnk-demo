package api

import (
	"encoding/json"
	"net/http"

	"github.com/blnk-demo/pay-recon/backend/internal/admin"
	"github.com/blnk-demo/pay-recon/backend/internal/admin/model"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc admin.Service
}

func NewHandler(svc admin.Service) *Handler {
	return &Handler{svc: svc}
}

func Mount(r chi.Router, h *Handler) {
	r.Get("/admins", h.List)
}

func (h *Handler) Bootstrap(w http.ResponseWriter, r *http.Request) {
	var input model.BootstrapInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}

	a, err := h.svc.Bootstrap(r.Context(), input)
	if err != nil {
		writeErr(w, http.StatusConflict, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, a)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	admins, total, err := h.svc.List(r.Context(), 1, 50)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "list_failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items": admins,
		"total": total,
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
