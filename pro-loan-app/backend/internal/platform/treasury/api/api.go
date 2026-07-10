package api

import (
	"encoding/json"
	"net/http"

	"github.com/blnk-demo/pro-loan-app/backend/internal/ledger"
	ledgermodel "github.com/blnk-demo/pro-loan-app/backend/internal/ledger/model"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/treasury"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/treasury/model"
)

type Handler struct {
	svc       treasury.Service
	ledgerSvc ledger.Service
}

func NewHandler(svc treasury.Service, ledgerSvc ledger.Service) *Handler {
	return &Handler{svc: svc, ledgerSvc: ledgerSvc}
}

func (h *Handler) GetTreasury(w http.ResponseWriter, r *http.Request) {
	currency := r.URL.Query().Get("currency")
	if currency == "" {
		currency = "NGN"
	}

	status, err := h.svc.GetStatus(r.Context(), currency)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	var recent []ledgermodel.Operation
	ops, err := h.ledgerSvc.ListByLoan(r.Context(), treasury.PlatformLoanID)
	if err == nil {
		for _, op := range ops {
			if op.Kind == ledgermodel.KindTreasuryPrefund && op.Currency == status.Currency {
				recent = append(recent, *op)
			}
			if len(recent) >= 10 {
				break
			}
		}
	}

	writeJSON(w, http.StatusOK, model.StatusResponse{
		Status:         *status,
		RecentPrefunds: recent,
	})
}

func (h *Handler) PrefundFundingPool(w http.ResponseWriter, r *http.Request) {
	var req model.PrefundRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_request")
		return
	}

	if req.Reference == "" {
		writeErr(w, http.StatusBadRequest, "reference is required")
		return
	}

	result, err := h.svc.PrefundFundingPool(r.Context(), model.PrefundInput{
		Currency:    req.Currency,
		AmountCents: req.AmountCents,
		Description: req.Description,
		Reference:   req.Reference,
	})
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
