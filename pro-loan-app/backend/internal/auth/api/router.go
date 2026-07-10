package api

import "github.com/go-chi/chi/v5"

func Mount(r chi.Router, h *Handler) {
	r.Route("/auth", func(r chi.Router) {
		r.Post("/admin/login", h.LoginAdmin)
		r.Post("/customer/login", h.LoginCustomer)
	})
}
