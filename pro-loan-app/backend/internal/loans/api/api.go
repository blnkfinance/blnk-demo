package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	authmodel "github.com/blnk-demo/pro-loan-app/backend/internal/auth/model"
	"github.com/blnk-demo/pro-loan-app/backend/internal/loans"
	"github.com/blnk-demo/pro-loan-app/backend/internal/loans/model"
	apimw "github.com/blnk-demo/pro-loan-app/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc loans.Service
}

func NewHandler(svc loans.Service) *Handler {
	return &Handler{svc: svc}
}

// Create applies for a new loan. For customers the customer_id is always
// derived from the JWT claims — the body field is ignored. Admins may pass an
// explicit customer_id to create a loan on behalf of a customer.
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.CreateApplicationInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}

	claims := apimw.ClaimsFromContext(r.Context())
	if claims != nil && claims.Role == authmodel.RoleCustomer {
		// Customers can only apply on behalf of themselves.
		input.CustomerID = claims.SubjectID
	}

	if input.CustomerID == "" {
		writeErr(w, http.StatusBadRequest, "customer_id is required")
		return
	}

	app, err := h.svc.Apply(r.Context(), input)
	if err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, app)
}

func (h *Handler) Quote(w http.ResponseWriter, r *http.Request) {
	productID := r.URL.Query().Get("product_id")
	principalCents, _ := strconv.ParseInt(r.URL.Query().Get("principal_cents"), 10, 64)
	termMonths, _ := strconv.Atoi(r.URL.Query().Get("term_months"))

	if productID == "" || principalCents <= 0 {
		writeErr(w, http.StatusBadRequest, "product_id and principal_cents are required")
		return
	}

	quote, err := h.svc.Quote(r.Context(), model.QuoteInput{
		ProductID:      productID,
		PrincipalCents: principalCents,
		TermMonths:     termMonths,
	})
	if err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, quote)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	loanID := chi.URLParam(r, "id")
	app, err := h.svc.GetByID(r.Context(), loanID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "loan_not_found")
		return
	}

	if !ownsLoan(r, app.CustomerID) {
		writeErr(w, http.StatusForbidden, "forbidden")
		return
	}

	writeJSON(w, http.StatusOK, app)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("page_size"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	filter := model.ListFilter{
		CustomerID: r.URL.Query().Get("customer_id"),
		Status:     model.Status(r.URL.Query().Get("status")),
		Page:       page,
		PageSize:   pageSize,
	}

	// Customers can only see their own loans regardless of any query param.
	claims := apimw.ClaimsFromContext(r.Context())
	if claims != nil && claims.Role == authmodel.RoleCustomer {
		filter.CustomerID = claims.SubjectID
	}

	items, total, err := h.svc.List(r.Context(), filter)
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

func (h *Handler) Submit(w http.ResponseWriter, r *http.Request) {
	loanID := chi.URLParam(r, "id")

	app, err := h.svc.GetByID(r.Context(), loanID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "loan_not_found")
		return
	}
	if !ownsLoan(r, app.CustomerID) {
		writeErr(w, http.StatusForbidden, "forbidden")
		return
	}

	app, err = h.svc.Submit(r.Context(), loanID)
	if err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, app)
}

func (h *Handler) Approve(w http.ResponseWriter, r *http.Request) {
	loanID := chi.URLParam(r, "id")
	app, err := h.svc.Approve(r.Context(), loanID)
	if err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, app)
}

func (h *Handler) Reject(w http.ResponseWriter, r *http.Request) {
	loanID := chi.URLParam(r, "id")

	var body struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	app, err := h.svc.Reject(r.Context(), loanID, body.Reason)
	if err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, app)
}

func (h *Handler) Disburse(w http.ResponseWriter, r *http.Request) {
	loanID := chi.URLParam(r, "id")
	app, err := h.svc.Disburse(r.Context(), loanID)
	if err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, app)
}

func (h *Handler) CommitDisbursement(w http.ResponseWriter, r *http.Request) {
	loanID := chi.URLParam(r, "id")
	app, err := h.svc.CommitDisbursement(r.Context(), loanID)
	if err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, app)
}

func (h *Handler) VoidDisbursement(w http.ResponseWriter, r *http.Request) {
	loanID := chi.URLParam(r, "id")
	app, err := h.svc.VoidDisbursement(r.Context(), loanID)
	if err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, app)
}

func (h *Handler) PayScheduleLine(w http.ResponseWriter, r *http.Request) {
	loanID := chi.URLParam(r, "id")
	scheduleID := chi.URLParam(r, "schedule_id")

	// Customers may only pay their own loan's schedule lines.
	app, err := h.svc.GetByID(r.Context(), loanID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "loan_not_found")
		return
	}
	if !ownsLoan(r, app.CustomerID) {
		writeErr(w, http.StatusForbidden, "forbidden")
		return
	}

	line, err := h.svc.PayScheduleLine(r.Context(), loanID, scheduleID)
	if err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, line)
}

func (h *Handler) RepayNextDue(w http.ResponseWriter, r *http.Request) {
	loanID := chi.URLParam(r, "id")

	app, err := h.svc.GetByID(r.Context(), loanID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "loan_not_found")
		return
	}
	if !ownsLoan(r, app.CustomerID) {
		writeErr(w, http.StatusForbidden, "forbidden")
		return
	}

	line, err := h.svc.RepayNextDue(r.Context(), loanID)
	if err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, line)
}

// ownsLoan returns true if the request comes from an admin (who can access any
// loan) or from the customer who owns the loan.
func ownsLoan(r *http.Request, loanCustomerID string) bool {
	claims := apimw.ClaimsFromContext(r.Context())
	if claims == nil {
		return false
	}
	if claims.Role == authmodel.RoleAdmin {
		return true
	}
	return claims.SubjectID == loanCustomerID
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
