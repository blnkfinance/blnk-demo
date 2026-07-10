package api

import "github.com/go-chi/chi/v5"

func Mount(r chi.Router, h *Handler) {
	r.Route("/platform/treasury", func(r chi.Router) {
		r.Get("/", h.GetTreasury)
		r.Post("/prefund", h.PrefundFundingPool)
	})
}
