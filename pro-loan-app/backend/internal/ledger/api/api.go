package api

import (
	"encoding/json"
	"net/http"

	"github.com/blnk-demo/pro-loan-app/backend/internal/ledger"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc ledger.Service
}

func NewHandler(svc ledger.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	op, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		writeErr(w, http.StatusNotFound, "operation_not_found")
		return
	}

	writeJSON(w, http.StatusOK, op)
}

func (h *Handler) ListByLoan(w http.ResponseWriter, r *http.Request) {
	loanID := chi.URLParam(r, "loan_id")
	ops, err := h.svc.ListByLoan(r.Context(), loanID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"data": ops})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
