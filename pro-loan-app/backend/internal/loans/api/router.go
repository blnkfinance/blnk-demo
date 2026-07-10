package api

import "github.com/go-chi/chi/v5"

func Mount(r chi.Router, h *Handler) {
	r.Route("/loans", func(r chi.Router) {
		r.Get("/quote", h.Quote)
		r.Get("/", h.List)
		r.Post("/", h.Create)
		r.Get("/{id}", h.Get)
		r.Post("/{id}/submit", h.Submit)
		r.Post("/{id}/approve", h.Approve)
		r.Post("/{id}/reject", h.Reject)
		r.Post("/{id}/disburse", h.Disburse)
		r.Post("/{id}/disburse/commit", h.CommitDisbursement)
		r.Post("/{id}/disburse/void", h.VoidDisbursement)
		r.Post("/{id}/schedule/{schedule_id}/pay", h.PayScheduleLine)
		r.Post("/{id}/repay", h.RepayNextDue)
	})
}
