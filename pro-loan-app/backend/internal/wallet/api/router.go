package api

import "github.com/go-chi/chi/v5"

func Mount(r chi.Router, h *Handler) {
	r.Get("/customers/me/transactions", h.ListMyTransactions)
	r.Get("/customers/me/transactions/{id}", h.GetMyTransaction)
	r.Post("/transfers", h.Transfer)
}

func MountAdmin(r chi.Router, h *Handler) {
	r.Get("/customers/{id}/transactions", h.ListCustomerTransactions)
}
