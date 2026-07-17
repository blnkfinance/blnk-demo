package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/blnk-demo/pay-recon/mock-bank/internal/statements"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc statements.Service
}

func NewHandler(svc statements.Service) *Handler {
	return &Handler{svc: svc}
}

func Mount(r chi.Router, h *Handler) {
	r.Get("/statement", h.JSON)
	r.Get("/statement/export", h.ExportCSV)
}

func (h *Handler) JSON(w http.ResponseWriter, r *http.Request) {
	accountID := r.URL.Query().Get("account_id")
	from, to, err := parseRange(r)
	if err != nil || accountID == "" {
		writeErr(w, http.StatusBadRequest, "invalid_params")
		return
	}
	lines, err := h.svc.List(r.Context(), accountID, from, to)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "list_failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": lines})
}

func (h *Handler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	accountID := r.URL.Query().Get("account_id")
	from, to, err := parseRange(r)
	if err != nil || accountID == "" {
		writeErr(w, http.StatusBadRequest, "invalid_params")
		return
	}
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", `attachment; filename="statement.csv"`)
	if err := h.svc.ExportCSV(r.Context(), accountID, from, to, w); err != nil {
		writeErr(w, http.StatusInternalServerError, "export_failed")
		return
	}
}

func parseRange(r *http.Request) (time.Time, time.Time, error) {
	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")
	if fromStr == "" || toStr == "" {
		now := time.Now().UTC()
		start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
		end := start.AddDate(0, 1, -1)
		return start, end, nil
	}
	from, err := time.Parse("2006-01-02", fromStr)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	to, err := time.Parse("2006-01-02", toStr)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	return from, to, nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErr(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}
