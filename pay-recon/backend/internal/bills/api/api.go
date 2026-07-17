package api

import (
	"encoding/json"
	"net/http"

	"github.com/blnk-demo/pay-recon/backend/internal/bills"
	"github.com/blnk-demo/pay-recon/backend/internal/bills/model"
	apimw "github.com/blnk-demo/pay-recon/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc bills.Service
}

func NewHandler(svc bills.Service) *Handler {
	return &Handler{svc: svc}
}

func Mount(r chi.Router, h *Handler) {
	r.Post("/bills", h.Create)
	r.Get("/bills", h.List)
	r.Get("/bills/{id}", h.Get)
	r.Post("/bills/{id}/confirm-payment", h.ConfirmPayment)
	r.Get("/bills/{id}/payment-instruction", h.PaymentInstruction)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.CreateBillInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}
	createdBy := "system"
	if claims := apimw.ClaimsFromContext(r.Context()); claims != nil {
		createdBy = claims.SubjectID
	}
	bill, err := h.svc.Create(r.Context(), input, createdBy)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	instruction, err := h.svc.PaymentInstruction(r.Context(), bill.ID)
	if err != nil {
		writeJSON(w, http.StatusCreated, model.CreateBillResponse{Bill: bill})
		return
	}
	writeJSON(w, http.StatusCreated, model.CreateBillResponse{Bill: bill, PaymentInstruction: instruction})
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	bill, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	writeJSON(w, http.StatusOK, bill)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	filter := model.ListFilter{
		Status:     r.URL.Query().Get("status"),
		MerchantID: r.URL.Query().Get("merchant_id"),
	}
	items, err := h.svc.List(r.Context(), filter)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
}

func (h *Handler) PaymentInstruction(w http.ResponseWriter, r *http.Request) {
	instruction, err := h.svc.PaymentInstruction(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	writeJSON(w, http.StatusOK, instruction)
}

func (h *Handler) ConfirmPayment(w http.ResponseWriter, r *http.Request) {
	var input model.ConfirmPaymentInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}
	confirmedBy := "system"
	if claims := apimw.ClaimsFromContext(r.Context()); claims != nil {
		confirmedBy = claims.SubjectID
	}
	bill, err := h.svc.ConfirmPayment(r.Context(), chi.URLParam(r, "id"), input, confirmedBy)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, bill)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErr(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}
