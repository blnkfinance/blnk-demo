package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/blnk-demo/pro-loan-app/backend/internal/loans/model"
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

func (r *MongoRepository) Create(ctx context.Context, app *model.Application) error {
	_, err := r.collection.InsertOne(ctx, app)
	return err
}

func (r *MongoRepository) GetByID(ctx context.Context, id string) (*model.Application, error) {
	var app model.Application
	if err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&app); err != nil {
		return nil, err
	}
	if app.Schedule == nil {
		app.Schedule = make([]model.ScheduleLine, 0)
	}
	return &app, nil
}

func (r *MongoRepository) Update(ctx context.Context, app *model.Application) error {
	_, err := r.collection.ReplaceOne(ctx, bson.M{"_id": app.ID}, app)
	return err
}

func (r *MongoRepository) List(ctx context.Context, filter model.ListFilter) ([]*model.Application, int64, error) {
	query := bson.M{}
	if filter.CustomerID != "" {
		query["customer_id"] = filter.CustomerID
	}
	if len(filter.Statuses) > 0 {
		statuses := make([]string, len(filter.Statuses))
		for i, s := range filter.Statuses {
			statuses[i] = string(s)
		}
		query["status"] = bson.M{"$in": statuses}
	} else if filter.Status != "" {
		query["status"] = filter.Status
	}
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 {
		filter.PageSize = 20
	}

	total, err := r.collection.CountDocuments(ctx, query)
	if err != nil {
		return nil, 0, err
	}

	cursor, err := r.collection.Find(ctx, query, options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetSkip(int64((filter.Page-1)*filter.PageSize)).
		SetLimit(int64(filter.PageSize)))
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	apps := make([]*model.Application, 0)
	for cursor.Next(ctx) {
		var app model.Application
		if err := cursor.Decode(&app); err != nil {
			return nil, 0, err
		}
		if app.Schedule == nil {
			app.Schedule = make([]model.ScheduleLine, 0)
		}
		apps = append(apps, &app)
	}
	if err := cursor.Err(); err != nil {
		return nil, 0, err
	}

	return apps, total, nil
}

func (r *MongoRepository) GetScheduleLine(ctx context.Context, loanID, scheduleID string) (*model.ScheduleLine, error) {
	app, err := r.GetByID(ctx, loanID)
	if err != nil {
		return nil, err
	}

	for _, line := range app.Schedule {
		if line.ID == scheduleID {
			return &line, nil
		}
	}

	return nil, fmt.Errorf("schedule line %s not found on loan %s", scheduleID, loanID)
}

func (r *MongoRepository) UpdateScheduleLine(ctx context.Context, loanID string, line model.ScheduleLine) error {
	res, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": loanID, "schedule.id": line.ID},
		bson.M{"$set": bson.M{"schedule.$": line}},
	)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return fmt.Errorf("schedule line %s not found on loan %s", line.ID, loanID)
	}
	return nil
}

// MarkDueLines sets all "scheduled" lines whose due date is today or earlier to
// "due" status.
func (r *MongoRepository) MarkDueLines(ctx context.Context) (int64, error) {
	now := time.Now().UTC()
	res, err := r.collection.UpdateMany(
		ctx,
		bson.M{
			"status": model.StatusActive,
			"schedule": bson.M{"$elemMatch": bson.M{
				"status":   model.ScheduleScheduled,
				"due_date": bson.M{"$lte": now},
			}},
		},
		bson.M{"$set": bson.M{"schedule.$[elem].status": model.ScheduleDue}},
		options.Update().SetArrayFilters(options.ArrayFilters{
			Filters: []any{bson.M{
				"elem.status":   model.ScheduleScheduled,
				"elem.due_date": bson.M{"$lte": now},
			}},
		}),
	)
	if err != nil {
		return 0, err
	}
	return res.ModifiedCount, nil
}

// MarkOverdueLines sets all "due" lines whose due date is more than 5 days ago
// (grace period) to "overdue" status.
func (r *MongoRepository) MarkOverdueLines(ctx context.Context) (int64, error) {
	graceCutoff := time.Now().UTC().AddDate(0, 0, -5)
	res, err := r.collection.UpdateMany(
		ctx,
		bson.M{
			"status": model.StatusActive,
			"schedule": bson.M{"$elemMatch": bson.M{
				"status":   model.ScheduleDue,
				"due_date": bson.M{"$lte": graceCutoff},
			}},
		},
		bson.M{"$set": bson.M{"schedule.$[elem].status": model.ScheduleOverdue}},
		options.Update().SetArrayFilters(options.ArrayFilters{
			Filters: []any{bson.M{
				"elem.status":   model.ScheduleDue,
				"elem.due_date": bson.M{"$lte": graceCutoff},
			}},
		}),
	)
	if err != nil {
		return 0, err
	}
	return res.ModifiedCount, nil
}

func (r *MongoRepository) ensureIndexes(ctx context.Context) error {
	_, err := r.collection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "customer_id", Value: 1}, {Key: "created_at", Value: -1}},
			Options: options.Index().SetName("idx_loans_customer_created_at"),
		},
		{
			Keys:    bson.D{{Key: "status", Value: 1}, {Key: "created_at", Value: -1}},
			Options: options.Index().SetName("idx_loans_status_created_at"),
		},
		{
			Keys:    bson.D{{Key: "blnk_mappings.loan_balance_id", Value: 1}},
			Options: options.Index().SetSparse(true).SetName("idx_loans_blnk_balance_id"),
		},
	})
	return err
}
