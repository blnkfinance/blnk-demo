package api

import "github.com/go-chi/chi/v5"

func Mount(r chi.Router, h *Handler) {
	r.Route("/customers", func(r chi.Router) {
		r.Get("/", h.List)
		r.Post("/", h.Register)
		r.Get("/me", h.GetMe)
		r.Get("/{id}", h.GetByID)
		r.Post("/{id}/sync-identity", h.SyncBlnkIdentity)
	})
}
