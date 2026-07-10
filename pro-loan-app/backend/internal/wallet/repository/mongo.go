package repository

import (
	"context"
	"fmt"

	"github.com/blnk-demo/pro-loan-app/backend/internal/wallet/model"
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

func (r *MongoRepository) Create(ctx context.Context, tx *model.WalletTransaction) error {
	_, err := r.collection.InsertOne(ctx, tx)
	return err
}

func (r *MongoRepository) GetByID(ctx context.Context, id string) (*model.WalletTransaction, error) {
	var tx model.WalletTransaction
	if err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&tx); err != nil {
		return nil, err
	}
	return &tx, nil
}

func (r *MongoRepository) GetByReference(ctx context.Context, reference string) (*model.WalletTransaction, error) {
	var tx model.WalletTransaction
	if err := r.collection.FindOne(ctx, bson.M{"reference": reference}).Decode(&tx); err != nil {
		return nil, err
	}
	return &tx, nil
}

func (r *MongoRepository) ListByCustomer(ctx context.Context, customerID string, page, pageSize int) ([]*model.WalletTransaction, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	filter := bson.M{"customer_id": customerID}
	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	cursor, err := r.collection.Find(ctx, filter,
		options.Find().
			SetSort(bson.D{{Key: "created_at", Value: -1}}).
			SetSkip(int64((page-1)*pageSize)).
			SetLimit(int64(pageSize)))
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	txs := make([]*model.WalletTransaction, 0)
	for cursor.Next(ctx) {
		var tx model.WalletTransaction
		if err := cursor.Decode(&tx); err != nil {
			return nil, 0, err
		}
		txs = append(txs, &tx)
	}
	if err := cursor.Err(); err != nil {
		return nil, 0, err
	}

	return txs, total, nil
}

func (r *MongoRepository) ensureIndexes(ctx context.Context) error {
	_, err := r.collection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "customer_id", Value: 1}, {Key: "created_at", Value: -1}},
			Options: options.Index().SetName("idx_wallet_tx_customer"),
		},
		{
			Keys:    bson.D{{Key: "reference", Value: 1}},
			Options: options.Index().SetUnique(true).SetSparse(true).SetName("uniq_wallet_tx_reference"),
		},
	})
	if err != nil {
		return fmt.Errorf("create wallet tx indexes: %w", err)
	}
	return nil
}
