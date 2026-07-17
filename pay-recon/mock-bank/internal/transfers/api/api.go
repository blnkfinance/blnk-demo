package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/blnk-demo/pay-recon/mock-bank/internal/transfers"
	"github.com/blnk-demo/pay-recon/mock-bank/internal/transfers/model"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc transfers.Service
}

func NewHandler(svc transfers.Service) *Handler {
	return &Handler{svc: svc}
}

func Mount(r chi.Router, h *Handler) {
	r.Post("/transfers", h.Request)
}

func (h *Handler) Request(w http.ResponseWriter, r *http.Request) {
	var input model.RequestTransferInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}
	t, err := h.svc.Request(r.Context(), input)
	if err != nil {
		if errors.Is(err, transfers.ErrInsufficientFunds) {
			writeErr(w, http.StatusBadRequest, "insufficient_funds")
			return
		}
		writeErr(w, http.StatusInternalServerError, "transfer_failed")
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErr(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}
