package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/blnk-demo/pay-recon/mock-bank/internal/accounts"
	"github.com/blnk-demo/pay-recon/mock-bank/internal/accounts/model"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc accounts.Service
}

func NewHandler(svc accounts.Service) *Handler {
	return &Handler{svc: svc}
}

func Mount(r chi.Router, h *Handler) {
	r.Get("/accounts", h.List)
	r.Post("/accounts", h.Create)
	r.Get("/accounts/operating", h.Operating)
	r.Post("/accounts/operating/fund", h.FundOperating)
	r.Get("/accounts/{id}/balance", h.Balance)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.List(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "list_failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.CreateAccountInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}
	a, err := h.svc.Create(r.Context(), input)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "create_failed")
		return
	}
	writeJSON(w, http.StatusCreated, a)
}

func (h *Handler) Operating(w http.ResponseWriter, r *http.Request) {
	a, err := h.svc.GetOperating(r.Context())
	if err != nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	writeJSON(w, http.StatusOK, a)
}

func (h *Handler) FundOperating(w http.ResponseWriter, r *http.Request) {
	var input model.FundAccountInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}
	a, err := h.svc.FundOperating(r.Context(), input)
	if err != nil {
		if errors.Is(err, accounts.ErrInvalidAmount) {
			writeErr(w, http.StatusBadRequest, "invalid_amount")
			return
		}
		writeErr(w, http.StatusInternalServerError, "fund_failed")
		return
	}
	writeJSON(w, http.StatusOK, a)
}

func (h *Handler) Balance(w http.ResponseWriter, r *http.Request) {
	a, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"balance": a.Balance, "account_number": a.AccountNumber})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErr(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}
