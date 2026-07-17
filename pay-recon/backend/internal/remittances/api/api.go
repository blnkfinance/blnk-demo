package api

import (
	"encoding/json"
	"net/http"

	"github.com/blnk-demo/pay-recon/backend/internal/remittances"
	"github.com/blnk-demo/pay-recon/backend/internal/remittances/model"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc remittances.Service
}

func NewHandler(svc remittances.Service) *Handler {
	return &Handler{svc: svc}
}

func Mount(r chi.Router, h *Handler) {
	r.Post("/tax-remittances", h.Create)
	r.Get("/tax-remittances", h.List)
	r.Post("/tax-remittances/{id}/confirm", h.Confirm)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.CreateRemittanceInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}
	rem, err := h.svc.Create(r.Context(), input)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, rem)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.List(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "list_failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
}

func (h *Handler) Confirm(w http.ResponseWriter, r *http.Request) {
	var input model.ConfirmRemittanceInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}
	rem, err := h.svc.Confirm(r.Context(), chi.URLParam(r, "id"), input)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, rem)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErr(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}
