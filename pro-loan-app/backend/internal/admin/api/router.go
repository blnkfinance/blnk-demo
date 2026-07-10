package api

import "github.com/go-chi/chi/v5"

func Mount(r chi.Router, h *Handler) {
	r.Route("/admins", func(r chi.Router) {
		r.Get("/", h.List)
		r.Post("/", h.Create)
		r.Get("/me", h.GetMe)
		r.Get("/{id}", h.GetByID)
		r.Patch("/{id}", h.Update)
	})
}
