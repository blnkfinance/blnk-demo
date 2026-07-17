package api

import (
	"encoding/json"
	"net/http"

	"github.com/blnk-demo/pay-recon/backend/internal/whtcategories"
	"github.com/blnk-demo/pay-recon/backend/internal/whtcategories/model"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc whtcategories.Service
}

func NewHandler(svc whtcategories.Service) *Handler {
	return &Handler{svc: svc}
}

func Mount(r chi.Router, h *Handler) {
	r.Get("/wht-categories", h.List)
	r.Post("/wht-categories", h.Create)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.List(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "list_failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.CreateCategoryInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}
	c, err := h.svc.Create(r.Context(), input)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "create_failed")
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErr(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}
