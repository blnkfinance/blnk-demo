package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	apimw "github.com/blnk-demo/pro-loan-app/backend/internal/middleware"
	"github.com/blnk-demo/pro-loan-app/backend/internal/wallet"
	"github.com/blnk-demo/pro-loan-app/backend/internal/wallet/model"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc wallet.Service
}

func NewHandler(svc wallet.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) ListMyTransactions(w http.ResponseWriter, r *http.Request) {
	customerID := apimw.ClaimsFromContext(r.Context()).SubjectID

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("page_size"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	items, total, err := h.svc.List(r.Context(), customerID, page, pageSize)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"data":      items,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *Handler) GetMyTransaction(w http.ResponseWriter, r *http.Request) {
	customerID := apimw.ClaimsFromContext(r.Context()).SubjectID
	txID := chi.URLParam(r, "id")

	tx, err := h.svc.Get(r.Context(), customerID, txID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "transaction_not_found")
		return
	}

	writeJSON(w, http.StatusOK, tx)
}

func (h *Handler) Transfer(w http.ResponseWriter, r *http.Request) {
	customerID := apimw.ClaimsFromContext(r.Context()).SubjectID

	var input model.TransferInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}

	if input.AmountCents <= 0 {
		writeErr(w, http.StatusBadRequest, "invalid_amount")
		return
	}

	recipientType := strings.ToLower(strings.TrimSpace(input.RecipientType))
	if recipientType == "" {
		recipientType = "internal"
	}
	if recipientType == "internal" && input.RecipientEmail == "" {
		writeErr(w, http.StatusBadRequest, "recipient_email_required")
		return
	}

	result, err := h.svc.Transfer(r.Context(), customerID, input)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) GetTransferFees(w http.ResponseWriter, r *http.Request) {
	currency := r.URL.Query().Get("currency")
	external := r.URL.Query().Get("external") == "true"

	fees, err := h.svc.TransferFeeConfig(r.Context(), currency, external)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, fees)
}

func (h *Handler) ResolveRecipient(w http.ResponseWriter, r *http.Request) {
	customerID := apimw.ClaimsFromContext(r.Context()).SubjectID
	email := strings.TrimSpace(r.URL.Query().Get("email"))
	if email == "" {
		writeErr(w, http.StatusBadRequest, "recipient_email_required")
		return
	}

	resolved, err := h.svc.ResolveRecipient(r.Context(), customerID, email)
	if err != nil {
		msg := err.Error()
		status := http.StatusNotFound
		if strings.Contains(msg, "yourself") || strings.Contains(msg, "required") {
			status = http.StatusBadRequest
		}
		writeErr(w, status, msg)
		return
	}

	writeJSON(w, http.StatusOK, resolved)
}

func (h *Handler) ListCustomerTransactions(w http.ResponseWriter, r *http.Request) {
	customerID := chi.URLParam(r, "id")

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("page_size"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	items, total, err := h.svc.List(r.Context(), customerID, page, pageSize)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"data":      items,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
