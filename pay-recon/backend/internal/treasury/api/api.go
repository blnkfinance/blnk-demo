package api

import (
	"encoding/json"
	"net/http"

	"github.com/blnk-demo/pay-recon/backend/internal/treasury"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc treasury.Service
}

func NewHandler(svc treasury.Service) *Handler {
	return &Handler{svc: svc}
}

func Mount(r chi.Router, h *Handler) {
	r.Get("/treasury/bank-cash", h.GetBankCash)
}

func (h *Handler) GetBankCash(w http.ResponseWriter, r *http.Request) {
	position, err := h.svc.GetBankCashPosition(r.Context())
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bank_cash_unavailable")
		return
	}
	writeJSON(w, http.StatusOK, position)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErr(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}
