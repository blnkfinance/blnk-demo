package repository

import (
	"context"

	"github.com/blnk-demo/pro-loan-app/backend/internal/customer/model"
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

func (r *MongoRepository) Create(ctx context.Context, c *model.Customer) error {
	_, err := r.collection.InsertOne(ctx, c)
	return err
}

func (r *MongoRepository) GetByID(ctx context.Context, id string) (*model.Customer, error) {
	var c model.Customer
	if err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *MongoRepository) GetByEmail(ctx context.Context, email string) (*model.Customer, error) {
	var c model.Customer
	if err := r.collection.FindOne(ctx, bson.M{"email": email}).Decode(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *MongoRepository) Update(ctx context.Context, c *model.Customer) error {
	_, err := r.collection.ReplaceOne(ctx, bson.M{"_id": c.ID}, c)
	return err
}

func (r *MongoRepository) List(ctx context.Context, page, pageSize int) ([]*model.Customer, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}

	filter := bson.M{}
	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	cursor, err := r.collection.Find(ctx, filter, options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetSkip(int64((page-1)*pageSize)).
		SetLimit(int64(pageSize)))
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	customers := make([]*model.Customer, 0)
	for cursor.Next(ctx) {
		var c model.Customer
		if err := cursor.Decode(&c); err != nil {
			return nil, 0, err
		}
		customers = append(customers, &c)
	}
	if err := cursor.Err(); err != nil {
		return nil, 0, err
	}

	return customers, total, nil
}

func (r *MongoRepository) ensureIndexes(ctx context.Context) error {
	_, err := r.collection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "email", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("uniq_customers_email"),
		},
		{
			Keys:    bson.D{{Key: "blnk_identity_id", Value: 1}},
			Options: options.Index().SetSparse(true).SetName("idx_customers_blnk_identity_id"),
		},
	})
	return err
}
