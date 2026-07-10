package repository

import (
	"context"

	"github.com/blnk-demo/pro-loan-app/backend/internal/ledger/model"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoRepository struct {
	collection *mongo.Collection
}

func NewMongo(ctx context.Context, collection *mongo.Collection) (*MongoRepository, error) {
	repo := &MongoRepository{collection: collection}
	if err := repo.ensureIndexes(ctx); err != nil {
		return nil, err
	}
	return repo, nil
}

func (r *MongoRepository) Create(ctx context.Context, op *model.Operation) error {
	_, err := r.collection.InsertOne(ctx, op)
	return err
}

func (r *MongoRepository) GetByID(ctx context.Context, id string) (*model.Operation, error) {
	var op model.Operation
	if err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&op); err != nil {
		return nil, err
	}
	return &op, nil
}

func (r *MongoRepository) GetByReference(ctx context.Context, reference string) (*model.Operation, error) {
	var op model.Operation
	if err := r.collection.FindOne(ctx, bson.M{"reference": reference}).Decode(&op); err != nil {
		return nil, err
	}
	return &op, nil
}

func (r *MongoRepository) Update(ctx context.Context, op *model.Operation) error {
	_, err := r.collection.ReplaceOne(ctx, bson.M{"_id": op.ID}, op)
	return err
}

func (r *MongoRepository) ListByLoan(ctx context.Context, loanID string) ([]*model.Operation, error) {
	cursor, err := r.collection.Find(ctx, bson.M{"loan_id": loanID}, options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var operations []*model.Operation
	for cursor.Next(ctx) {
		var op model.Operation
		if err := cursor.Decode(&op); err != nil {
			return nil, err
		}
		operations = append(operations, &op)
	}
	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return operations, nil
}

func (r *MongoRepository) ensureIndexes(ctx context.Context) error {
	_, err := r.collection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "reference", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("uniq_ledger_operations_reference"),
		},
		{
			Keys:    bson.D{{Key: "loan_id", Value: 1}, {Key: "created_at", Value: -1}},
			Options: options.Index().SetName("idx_ledger_operations_loan_created_at"),
		},
		{
			Keys:    bson.D{{Key: "status", Value: 1}, {Key: "updated_at", Value: 1}},
			Options: options.Index().SetName("idx_ledger_operations_status_updated_at"),
		},
		{
			Keys:    bson.D{{Key: "blnk_transaction_id", Value: 1}},
			Options: options.Index().SetSparse(true).SetName("idx_ledger_operations_blnk_transaction_id"),
		},
	})
	return err
}
