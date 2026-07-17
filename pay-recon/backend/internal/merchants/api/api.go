package api

import (
	"encoding/json"
	"net/http"

	"github.com/blnk-demo/pay-recon/backend/internal/merchants"
	"github.com/blnk-demo/pay-recon/backend/internal/merchants/model"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc merchants.Service
}

func NewHandler(svc merchants.Service) *Handler {
	return &Handler{svc: svc}
}

func Mount(r chi.Router, h *Handler) {
	r.Post("/merchants", h.Create)
	r.Get("/merchants", h.List)
	r.Get("/merchants/{id}", h.Get)
	r.Patch("/merchants/{id}", h.Update)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.CreateMerchantInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}
	m, err := h.svc.Create(r.Context(), input)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, m)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	m, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.List(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "list_failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	var input model.UpdateMerchantInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}
	m, err := h.svc.Update(r.Context(), chi.URLParam(r, "id"), input)
	if err != nil {
		writeErr(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErr(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}
