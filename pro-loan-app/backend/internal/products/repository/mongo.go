package repository

import (
	"context"

	"github.com/blnk-demo/pro-loan-app/backend/internal/products/model"
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

func (r *MongoRepository) Create(ctx context.Context, p *model.Product) error {
	_, err := r.collection.InsertOne(ctx, p)
	return err
}

func (r *MongoRepository) GetByID(ctx context.Context, id string) (*model.Product, error) {
	var p model.Product
	if err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&p); err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *MongoRepository) Update(ctx context.Context, p *model.Product) error {
	_, err := r.collection.ReplaceOne(ctx, bson.M{"_id": p.ID}, p)
	return err
}

func (r *MongoRepository) List(ctx context.Context, includeArchived bool) ([]*model.Product, error) {
	filter := bson.M{}
	if !includeArchived {
		filter["archived"] = bson.M{"$ne": true}
	}

	cursor, err := r.collection.Find(ctx, filter, options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	products := make([]*model.Product, 0)
	for cursor.Next(ctx) {
		var p model.Product
		if err := cursor.Decode(&p); err != nil {
			return nil, err
		}
		products = append(products, &p)
	}
	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return products, nil
}

func (r *MongoRepository) ensureIndexes(ctx context.Context) error {
	_, err := r.collection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "name", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("uniq_products_name"),
		},
		{
			Keys:    bson.D{{Key: "archived", Value: 1}, {Key: "created_at", Value: -1}},
			Options: options.Index().SetName("idx_products_archived_created_at"),
		},
	})
	return err
}
