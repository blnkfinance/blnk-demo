package api

import "github.com/go-chi/chi/v5"

func Mount(r chi.Router, h *Handler) {
	r.Route("/balances", func(r chi.Router) {
		r.Get("/{id}", h.GetByID)
		r.Get("/loans/{loan_id}", h.ListByLoan)
	})
}
