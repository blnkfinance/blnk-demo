package api

import "github.com/go-chi/chi/v5"

func Mount(r chi.Router, h *Handler) {
	r.Route("/ledger", func(r chi.Router) {
		r.Get("/operations/{id}", h.GetByID)
		r.Get("/loans/{loan_id}/operations", h.ListByLoan)
	})
}
