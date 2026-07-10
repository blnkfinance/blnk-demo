package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/blnk-demo/pro-loan-app/backend/internal/admin"
	"github.com/blnk-demo/pro-loan-app/backend/internal/admin/model"
	apimw "github.com/blnk-demo/pro-loan-app/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc admin.Service
}

func NewHandler(svc admin.Service) *Handler {
	return &Handler{svc: svc}
}

// Bootstrap creates the very first admin account. It is only callable when
// no admins exist in the database; once one exists it returns 409 so it
// cannot be used to silently add admins without auth.
func (h *Handler) Bootstrap(w http.ResponseWriter, r *http.Request) {
	has, err := h.svc.HasAny(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal_error")
		return
	}
	if has {
		writeErr(w, http.StatusConflict, "admin_already_exists")
		return
	}

	var input model.CreateAdminInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}

	a, err := h.svc.Create(r.Context(), input)
	if err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, a)
}

// Create adds a new admin. Requires an existing admin token (enforced in router).
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.CreateAdminInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}

	a, err := h.svc.Create(r.Context(), input)
	if err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, a)
}

// GetMe returns the profile of the currently authenticated admin.
func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	claims := apimw.ClaimsFromContext(r.Context())
	if claims == nil {
		writeErr(w, http.StatusUnauthorized, "missing_token")
		return
	}

	a, err := h.svc.GetByID(r.Context(), claims.SubjectID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "admin_not_found")
		return
	}

	writeJSON(w, http.StatusOK, a)
}

// GetByID returns a single admin by ID.
func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	a, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		writeErr(w, http.StatusNotFound, "admin_not_found")
		return
	}
	writeJSON(w, http.StatusOK, a)
}

// List returns a paginated list of admins.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("page_size"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	admins, total, err := h.svc.List(r.Context(), page, pageSize)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"data":      admins,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// Update modifies an admin's profile or password.
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var input model.UpdateAdminInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_json")
		return
	}

	a, err := h.svc.Update(r.Context(), id, input)
	if err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, a)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
