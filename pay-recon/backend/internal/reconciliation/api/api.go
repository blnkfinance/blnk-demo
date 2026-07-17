package api

import (
	"encoding/json"
	"net/http"

	"github.com/blnk-demo/pay-recon/backend/internal/middleware"
	"github.com/blnk-demo/pay-recon/backend/internal/reconciliation"
	"github.com/blnk-demo/pay-recon/backend/internal/reconciliation/model"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc reconciliation.Service
}

func NewHandler(svc reconciliation.Service) *Handler {
	return &Handler{svc: svc}
}

func Mount(r chi.Router, h *Handler) {
	r.Post("/reconciliation/upload", h.Upload)
	r.Get("/reconciliation/uploads/{id}", h.GetUpload)
	r.Post("/reconciliation/runs", h.StartRun)
	r.Get("/reconciliation/runs", h.ListRuns)
	r.Get("/reconciliation/runs/{id}", h.GetRun)
	r.Get("/reconciliation/runs/{id}/exceptions", h.ListExceptions)
	r.Post("/reconciliation/exceptions/{id}/resolve", h.ResolveException)
}

func (h *Handler) Upload(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(20 << 20); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_form")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeErr(w, http.StatusBadRequest, "missing_file")
		return
	}
	defer file.Close()

	source := r.FormValue("source")
	if source == "" {
		source = "mock-bank"
	}
	uploadedBy := "system"
	if claims := middleware.ClaimsFromContext(r.Context()); claims != nil {
		uploadedBy = claims.SubjectID
	}

	u, err := h.svc.Upload(r.Context(), model.UploadStatementInput{
		Source:     source,
		Filename:   header.Filename,
		UploadedBy: uploadedBy,
		Cadence:    r.FormValue("cadence"),
	}, file)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, u)
}

func (h *Handler) GetUpload(w http.ResponseWriter, r *http.Request) {
	u, err := h.svc.GetUpload(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

func (h *Handler) StartRun(w http.ResponseWriter, r *http.Request) {
	var input model.StartRunInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}
	run, err := h.svc.StartRun(r.Context(), input.UploadID)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, run)
}

func (h *Handler) GetRun(w http.ResponseWriter, r *http.Request) {
	run, err := h.svc.GetRun(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	writeJSON(w, http.StatusOK, run)
}

func (h *Handler) ListRuns(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListRuns(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "list_failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
}

func (h *Handler) ListExceptions(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListExceptions(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "list_failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) ResolveException(w http.ResponseWriter, r *http.Request) {
	var input model.ResolveExceptionInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}
	if err := h.svc.ResolveException(r.Context(), chi.URLParam(r, "id"), input); err != nil {
		writeErr(w, http.StatusBadRequest, "resolve_failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErr(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}
