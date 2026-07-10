package repository

import (
	"context"

	"github.com/blnk-demo/pro-loan-app/backend/internal/admin/model"
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

func (r *MongoRepository) Create(ctx context.Context, a *model.Admin) error {
	_, err := r.collection.InsertOne(ctx, a)
	return err
}

func (r *MongoRepository) GetByID(ctx context.Context, id string) (*model.Admin, error) {
	var a model.Admin
	if err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&a); err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *MongoRepository) GetByEmail(ctx context.Context, email string) (*model.Admin, error) {
	var a model.Admin
	if err := r.collection.FindOne(ctx, bson.M{"email": email}).Decode(&a); err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *MongoRepository) Update(ctx context.Context, a *model.Admin) error {
	_, err := r.collection.ReplaceOne(ctx, bson.M{"_id": a.ID}, a)
	return err
}

func (r *MongoRepository) List(ctx context.Context, page, pageSize int) ([]*model.Admin, int64, error) {
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

	admins := make([]*model.Admin, 0)
	for cursor.Next(ctx) {
		var a model.Admin
		if err := cursor.Decode(&a); err != nil {
			return nil, 0, err
		}
		admins = append(admins, &a)
	}
	if err := cursor.Err(); err != nil {
		return nil, 0, err
	}

	return admins, total, nil
}

func (r *MongoRepository) Count(ctx context.Context) (int64, error) {
	return r.collection.CountDocuments(ctx, bson.M{})
}

func (r *MongoRepository) ensureIndexes(ctx context.Context) error {
	_, err := r.collection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "email", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("uniq_admins_email"),
		},
		{
			Keys:    bson.D{{Key: "status", Value: 1}},
			Options: options.Index().SetName("idx_admins_status"),
		},
	})
	return err
}
