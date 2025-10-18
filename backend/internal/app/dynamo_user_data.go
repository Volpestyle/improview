package app

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/expression"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"improview/backend/internal/api"
	"improview/backend/internal/domain"
)

const (
	entityProfile      = "PROFILE"
	entitySavedProblem = "SAVED_PROBLEM"
	entitySavedAttempt = "SAVED_ATTEMPT"

	defaultAttemptIndex      = "gsi1"
	defaultUserActivityIndex = "gsi2"
)

// DynamoUserDataStore persists user profiles and saved problem metadata in DynamoDB.
type DynamoUserDataStore struct {
	client            *dynamodb.Client
	tableName         string
	attemptIndexName  string
	userActivityIndex string
}

// NewDynamoUserDataStoreFromEnv constructs a store using AWS configuration resolved from the environment.
func NewDynamoUserDataStoreFromEnv(ctx context.Context, tableName, attemptIndex, userActivityIndex string) (*DynamoUserDataStore, error) {
	if strings.TrimSpace(tableName) == "" {
		return nil, errors.New("dynamo store: table name is required")
	}

	if attemptIndex == "" {
		attemptIndex = defaultAttemptIndex
	}
	if userActivityIndex == "" {
		userActivityIndex = defaultUserActivityIndex
	}

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("dynamo store: load config: %w", err)
	}

	client := dynamodb.NewFromConfig(cfg)
	return &DynamoUserDataStore{
		client:            client,
		tableName:         tableName,
		attemptIndexName:  attemptIndex,
		userActivityIndex: userActivityIndex,
	}, nil
}

func userPartitionKey(userID string) string {
	return "USER#" + userID
}

func profileSortKey() string {
	return "PROFILE"
}

func savedProblemSortKey(savedProblemID string) string {
	return "SAVED#" + savedProblemID
}

func savedProblemPartitionKey(savedProblemID string) string {
	return "SAVED#" + savedProblemID
}

func attemptSortKey(ts string, attemptID string) string {
	return "ATTEMPT#" + ts + "#" + attemptID
}

func gsi1ForProblem(userID, problemID, savedProblemID string) (string, string) {
	return "PROBLEM#" + problemID + "#USER#" + userID, "SAVED#" + savedProblemID
}

func gsi1ForAttempt(attemptID, savedProblemID string) (string, string) {
	return "ATTEMPT#" + attemptID, "SAVED#" + savedProblemID
}

func gsi2ForAttempt(userID, savedProblemID, attemptID string, updatedAt int64) (string, string) {
	return "USER#" + userID + "#ATTEMPT", fmt.Sprintf("%013d#%s#%s", updatedAt, savedProblemID, attemptID)
}

type userProfileItem struct {
	PK          string            `dynamodbav:"pk"`
	SK          string            `dynamodbav:"sk"`
	Entity      string            `dynamodbav:"entity"`
	UserID      string            `dynamodbav:"user_id"`
	Handle      string            `dynamodbav:"handle,omitempty"`
	DisplayName string            `dynamodbav:"display_name,omitempty"`
	Bio         string            `dynamodbav:"bio,omitempty"`
	AvatarURL   string            `dynamodbav:"avatar_url,omitempty"`
	Timezone    string            `dynamodbav:"timezone,omitempty"`
	Preferences map[string]string `dynamodbav:"preferences,omitempty"`
	CreatedAt   int64             `dynamodbav:"created_at"`
	UpdatedAt   int64             `dynamodbav:"updated_at"`
}

type savedProblemItem struct {
	PK                     string   `dynamodbav:"pk"`
	SK                     string   `dynamodbav:"sk"`
	Entity                 string   `dynamodbav:"entity"`
	UserID                 string   `dynamodbav:"user_id"`
	SavedProblemID         string   `dynamodbav:"saved_problem_id"`
	ProblemID              string   `dynamodbav:"problem_id"`
	Title                  string   `dynamodbav:"title,omitempty"`
	Language               string   `dynamodbav:"language"`
	Status                 string   `dynamodbav:"status"`
	Tags                   []string `dynamodbav:"tags,omitempty"`
	Notes                  string   `dynamodbav:"notes,omitempty"`
	HintUnlocked           bool     `dynamodbav:"hint_unlocked"`
	CreatedAt              int64    `dynamodbav:"created_at"`
	UpdatedAt              int64    `dynamodbav:"updated_at"`
	LastAttemptID          string   `dynamodbav:"last_attempt_id,omitempty"`
	LastAttemptStatus      string   `dynamodbav:"last_attempt_status,omitempty"`
	LastAttemptUpdatedAt   int64    `dynamodbav:"last_attempt_updated_at,omitempty"`
	LastAttemptPassCount   int      `dynamodbav:"last_attempt_pass_count,omitempty"`
	LastAttemptFailCount   int      `dynamodbav:"last_attempt_fail_count,omitempty"`
	LastAttemptRuntimeMS   int64    `dynamodbav:"last_attempt_runtime_ms,omitempty"`
	LastAttemptCode        string   `dynamodbav:"last_attempt_code,omitempty"`
	LastAttemptCodeS3Key   string   `dynamodbav:"last_attempt_code_s3_key,omitempty"`
	LastAttemptSubmittedAt *int64   `dynamodbav:"last_attempt_submitted_at,omitempty"`
	GSI1PK                 string   `dynamodbav:"gsi1pk"`
	GSI1SK                 string   `dynamodbav:"gsi1sk"`
}

type savedAttemptItem struct {
	PK             string `dynamodbav:"pk"`
	SK             string `dynamodbav:"sk"`
	Entity         string `dynamodbav:"entity"`
	UserID         string `dynamodbav:"user_id"`
	SavedProblemID string `dynamodbav:"saved_problem_id"`
	AttemptID      string `dynamodbav:"attempt_id"`
	Status         string `dynamodbav:"status"`
	UpdatedAt      int64  `dynamodbav:"updated_at"`
	PassCount      int    `dynamodbav:"pass_count"`
	FailCount      int    `dynamodbav:"fail_count"`
	RuntimeMS      int64  `dynamodbav:"runtime_ms"`
	Code           string `dynamodbav:"code,omitempty"`
	CodeS3Key      string `dynamodbav:"code_s3_key,omitempty"`
	SubmittedAt    *int64 `dynamodbav:"submitted_at,omitempty"`
	GSI1PK         string `dynamodbav:"gsi1pk"`
	GSI1SK         string `dynamodbav:"gsi1sk"`
	GSI2PK         string `dynamodbav:"gsi2pk"`
	GSI2SK         string `dynamodbav:"gsi2sk"`
}

func (s *DynamoUserDataStore) fetchSavedProblemItem(ctx context.Context, userID, savedProblemID string) (savedProblemItem, error) {
	key := map[string]types.AttributeValue{
		"pk": &types.AttributeValueMemberS{Value: userPartitionKey(userID)},
		"sk": &types.AttributeValueMemberS{Value: savedProblemSortKey(savedProblemID)},
	}
	out, err := s.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: &s.tableName,
		Key:       key,
	})
	if err != nil {
		return savedProblemItem{}, fmt.Errorf("dynamo store: get saved problem: %w", err)
	}
	if out.Item == nil || len(out.Item) == 0 {
		return savedProblemItem{}, api.ErrNotFound
	}

	var item savedProblemItem
	if err := attributevalue.UnmarshalMap(out.Item, &item); err != nil {
		return savedProblemItem{}, fmt.Errorf("dynamo store: decode saved problem: %w", err)
	}
	return item, nil
}

func (s *DynamoUserDataStore) putSavedProblemItem(ctx context.Context, item savedProblemItem) error {
	av, err := attributevalue.MarshalMap(item)
	if err != nil {
		return fmt.Errorf("dynamo store: encode saved problem: %w", err)
	}
	if _, err := s.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: &s.tableName,
		Item:      av,
	}); err != nil {
		return fmt.Errorf("dynamo store: save saved problem: %w", err)
	}
	return nil
}

// GetProfile retrieves the persisted profile for the given user.
func (s *DynamoUserDataStore) GetProfile(ctx context.Context, userID string) (domain.UserProfile, error) {
	key := map[string]types.AttributeValue{
		"pk": &types.AttributeValueMemberS{Value: userPartitionKey(userID)},
		"sk": &types.AttributeValueMemberS{Value: profileSortKey()},
	}

	out, err := s.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: &s.tableName,
		Key:       key,
	})
	if err != nil {
		return domain.UserProfile{}, fmt.Errorf("dynamo store: get profile: %w", err)
	}

	if out.Item == nil || len(out.Item) == 0 {
		return domain.UserProfile{}, api.ErrNotFound
	}

	var item userProfileItem
	if err := attributevalue.UnmarshalMap(out.Item, &item); err != nil {
		return domain.UserProfile{}, fmt.Errorf("dynamo store: decode profile: %w", err)
	}

	return toDomainProfile(item), nil
}

// UpsertProfile stores or updates the user's profile.
func (s *DynamoUserDataStore) UpsertProfile(ctx context.Context, userID string, update domain.UserProfileUpdate, now time.Time) (domain.UserProfile, error) {
	nowMillis := now.UnixMilli()
	existing, err := s.GetProfile(ctx, userID)
	if err != nil && !errors.Is(err, api.ErrNotFound) {
		return domain.UserProfile{}, err
	}

	if existing.UserID == "" {
		existing = domain.UserProfile{
			UserID:      userID,
			Preferences: map[string]string{},
			CreatedAt:   nowMillis,
		}
	}

	if update.Handle != nil {
		existing.Handle = strings.TrimSpace(*update.Handle)
	}
	if update.DisplayName != nil {
		existing.DisplayName = strings.TrimSpace(*update.DisplayName)
	}
	if update.Bio != nil {
		existing.Bio = strings.TrimSpace(*update.Bio)
	}
	if update.AvatarURL != nil {
		existing.AvatarURL = strings.TrimSpace(*update.AvatarURL)
	}
	if update.Timezone != nil {
		existing.Timezone = strings.TrimSpace(*update.Timezone)
	}
	if update.Preferences != nil {
		existing.Preferences = update.Preferences
	}
	if existing.Preferences == nil {
		existing.Preferences = map[string]string{}
	}

	if existing.CreatedAt == 0 {
		existing.CreatedAt = nowMillis
	}
	existing.UpdatedAt = nowMillis

	item := userProfileItem{
		PK:          userPartitionKey(userID),
		SK:          profileSortKey(),
		Entity:      entityProfile,
		UserID:      userID,
		Handle:      existing.Handle,
		DisplayName: existing.DisplayName,
		Bio:         existing.Bio,
		AvatarURL:   existing.AvatarURL,
		Timezone:    existing.Timezone,
		Preferences: existing.Preferences,
		CreatedAt:   existing.CreatedAt,
		UpdatedAt:   existing.UpdatedAt,
	}

	av, err := attributevalue.MarshalMap(item)
	if err != nil {
		return domain.UserProfile{}, fmt.Errorf("dynamo store: encode profile: %w", err)
	}

	if _, err := s.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: &s.tableName,
		Item:      av,
	}); err != nil {
		return domain.UserProfile{}, fmt.Errorf("dynamo store: save profile: %w", err)
	}

	return existing, nil
}

// ListSavedProblems returns saved problem summaries for the user.
func (s *DynamoUserDataStore) ListSavedProblems(ctx context.Context, userID string, opts domain.SavedProblemListOptions) (domain.SavedProblemListResult, error) {
	keyCond := expression.Key("pk").Equal(expression.Value(userPartitionKey(userID))).
		And(expression.Key("sk").BeginsWith("SAVED#"))

	builder := expression.NewBuilder().WithKeyCondition(keyCond)
	if opts.Status != "" {
		builder = builder.WithFilter(expression.Name("status").Equal(expression.Value(string(opts.Status))))
	}

	expr, err := builder.Build()
	if err != nil {
		return domain.SavedProblemListResult{}, fmt.Errorf("dynamo store: build list expression: %w", err)
	}

	limit := opts.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	input := &dynamodb.QueryInput{
		TableName:                 &s.tableName,
		KeyConditionExpression:    expr.KeyCondition(),
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		FilterExpression:          expr.Filter(),
		Limit:                     aws.Int32(limit),
		ScanIndexForward:          aws.Bool(false),
	}

	if token := strings.TrimSpace(opts.NextToken); token != "" {
		input.ExclusiveStartKey = map[string]types.AttributeValue{
			"pk": &types.AttributeValueMemberS{Value: userPartitionKey(userID)},
			"sk": &types.AttributeValueMemberS{Value: savedProblemSortKey(token)},
		}
	}

	out, err := s.client.Query(ctx, input)
	if err != nil {
		return domain.SavedProblemListResult{}, fmt.Errorf("dynamo store: list saved problems: %w", err)
	}

	items := make([]savedProblemItem, 0, len(out.Items))
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &items); err != nil {
		return domain.SavedProblemListResult{}, fmt.Errorf("dynamo store: decode saved problems: %w", err)
	}

	summaries := make([]domain.SavedProblemSummary, 0, len(items))
	for _, item := range items {
		summaries = append(summaries, toDomainSavedProblemSummary(item))
	}

	// Sort client-side by updated_at descending to provide intuitive ordering.
	sort.Slice(summaries, func(i, j int) bool {
		return summaries[i].UpdatedAt > summaries[j].UpdatedAt
	})

	var nextToken string
	if out.LastEvaluatedKey != nil && len(out.LastEvaluatedKey) > 0 {
		if skAttr, ok := out.LastEvaluatedKey["sk"].(*types.AttributeValueMemberS); ok {
			nextToken = strings.TrimPrefix(skAttr.Value, "SAVED#")
		}
	}

	return domain.SavedProblemListResult{
		Items:     summaries,
		NextToken: nextToken,
	}, nil
}

// CreateSavedProblem persists a new saved problem for the user.
func (s *DynamoUserDataStore) CreateSavedProblem(ctx context.Context, userID string, input domain.SavedProblemCreateInput, now time.Time) (domain.SavedProblemSummary, error) {
	problemID := strings.TrimSpace(input.ProblemID)
	language := strings.TrimSpace(input.Language)
	if problemID == "" || language == "" {
		return domain.SavedProblemSummary{}, api.ErrBadRequest
	}

	status := input.Status
	if status == "" {
		status = domain.SavedProblemStatusInProgress
	}

	nowMillis := now.UnixMilli()
	savedProblemID := randomID()
	tags := normalizeTags(input.Tags)

	gsi1pk, gsi1sk := gsi1ForProblem(userID, problemID, savedProblemID)
	item := savedProblemItem{
		PK:             userPartitionKey(userID),
		SK:             savedProblemSortKey(savedProblemID),
		Entity:         entitySavedProblem,
		UserID:         userID,
		SavedProblemID: savedProblemID,
		ProblemID:      problemID,
		Title:          strings.TrimSpace(input.Title),
		Language:       language,
		Status:         string(status),
		Tags:           tags,
		Notes:          strings.TrimSpace(input.Notes),
		HintUnlocked:   input.HintUnlocked,
		CreatedAt:      nowMillis,
		UpdatedAt:      nowMillis,
		GSI1PK:         gsi1pk,
		GSI1SK:         gsi1sk,
	}

	if err := s.putSavedProblemItem(ctx, item); err != nil {
		return domain.SavedProblemSummary{}, err
	}

	return toDomainSavedProblemSummary(item), nil
}

// GetSavedProblem fetches saved problem detail with attempts.
func (s *DynamoUserDataStore) GetSavedProblem(ctx context.Context, userID, savedProblemID string) (domain.SavedProblemDetail, error) {
	item, err := s.fetchSavedProblemItem(ctx, userID, savedProblemID)
	if err != nil {
		return domain.SavedProblemDetail{}, err
	}

	attempts, err := s.listAttemptsInternal(ctx, item)
	if err != nil {
		return domain.SavedProblemDetail{}, err
	}

	return domain.SavedProblemDetail{
		SavedProblemSummary: toDomainSavedProblemSummary(item),
		Attempts:            attempts,
	}, nil
}

// UpdateSavedProblem applies partial metadata updates.
func (s *DynamoUserDataStore) UpdateSavedProblem(ctx context.Context, userID, savedProblemID string, input domain.SavedProblemUpdateInput, now time.Time) (domain.SavedProblemSummary, error) {
	item, err := s.fetchSavedProblemItem(ctx, userID, savedProblemID)
	if err != nil {
		return domain.SavedProblemSummary{}, err
	}

	if input.Status != nil {
		item.Status = string(*input.Status)
	}
	if input.Notes != nil {
		item.Notes = strings.TrimSpace(*input.Notes)
	}
	if input.HintUnlocked != nil {
		item.HintUnlocked = *input.HintUnlocked
	}
	if input.Tags != nil {
		item.Tags = normalizeTags(input.Tags)
	}

	item.UpdatedAt = now.UnixMilli()

	if err := s.putSavedProblemItem(ctx, item); err != nil {
		return domain.SavedProblemSummary{}, err
	}
	return toDomainSavedProblemSummary(item), nil
}

// DeleteSavedProblem removes the saved problem and all associated attempts.
func (s *DynamoUserDataStore) DeleteSavedProblem(ctx context.Context, userID, savedProblemID string) error {
	item, err := s.fetchSavedProblemItem(ctx, userID, savedProblemID)
	if err != nil {
		return err
	}

	// Delete attempt snapshots in batches of 25 (BatchWriteItem limit).
	for {
		query, err := s.client.Query(ctx, &dynamodb.QueryInput{
			TableName:              &s.tableName,
			KeyConditionExpression: aws.String("pk = :pk AND begins_with(sk, :prefix)"),
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":pk":     &types.AttributeValueMemberS{Value: savedProblemPartitionKey(item.SavedProblemID)},
				":prefix": &types.AttributeValueMemberS{Value: "ATTEMPT#"},
			},
			Limit:            aws.Int32(25),
			ScanIndexForward: aws.Bool(false),
		})
		if err != nil {
			return fmt.Errorf("dynamo store: query attempts for delete: %w", err)
		}

		if len(query.Items) == 0 {
			break
		}

		writeRequests := make([]types.WriteRequest, 0, len(query.Items))
		for _, itemMap := range query.Items {
			writeRequests = append(writeRequests, types.WriteRequest{
				DeleteRequest: &types.DeleteRequest{
					Key: map[string]types.AttributeValue{
						"pk": itemMap["pk"],
						"sk": itemMap["sk"],
					},
				},
			})
		}

		_, err = s.client.BatchWriteItem(ctx, &dynamodb.BatchWriteItemInput{
			RequestItems: map[string][]types.WriteRequest{
				s.tableName: writeRequests,
			},
		})
		if err != nil {
			return fmt.Errorf("dynamo store: delete attempts: %w", err)
		}

		if query.LastEvaluatedKey == nil || len(query.LastEvaluatedKey) == 0 {
			break
		}
	}

	// Delete the saved problem metadata.
	_, err = s.client.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: &s.tableName,
		Key: map[string]types.AttributeValue{
			"pk": &types.AttributeValueMemberS{Value: userPartitionKey(item.UserID)},
			"sk": &types.AttributeValueMemberS{Value: savedProblemSortKey(item.SavedProblemID)},
		},
	})
	if err != nil {
		return fmt.Errorf("dynamo store: delete saved problem: %w", err)
	}

	return nil
}

// AppendAttempt persists a new attempt snapshot for the saved problem.
func (s *DynamoUserDataStore) AppendAttempt(ctx context.Context, userID, savedProblemID string, input domain.SavedProblemAttemptInput, now time.Time) (domain.SavedAttemptSnapshot, error) {
	item, err := s.fetchSavedProblemItem(ctx, userID, savedProblemID)
	if err != nil {
		return domain.SavedAttemptSnapshot{}, err
	}

	attemptID := strings.TrimSpace(input.AttemptID)
	if attemptID == "" {
		attemptID = randomID()
	}

	status := input.Status
	if status == "" {
		status = domain.SavedAttemptStatusSubmitted
	}

	updatedAt := now.UnixMilli()

	item.LastAttemptID = attemptID
	item.LastAttemptStatus = string(status)
	item.LastAttemptUpdatedAt = updatedAt
	item.LastAttemptPassCount = input.PassCount
	item.LastAttemptFailCount = input.FailCount
	item.LastAttemptRuntimeMS = input.RuntimeMS
	item.LastAttemptCode = input.Code
	item.LastAttemptCodeS3Key = input.CodeS3Key
	item.LastAttemptSubmittedAt = input.SubmittedAt
	item.UpdatedAt = updatedAt

	ts := fmt.Sprintf("%013d", updatedAt)
	gsi1pk, gsi1sk := gsi1ForAttempt(attemptID, item.SavedProblemID)
	gsi2pk, gsi2sk := gsi2ForAttempt(userID, item.SavedProblemID, attemptID, updatedAt)

	attemptItem := savedAttemptItem{
		PK:             savedProblemPartitionKey(item.SavedProblemID),
		SK:             attemptSortKey(ts, attemptID),
		Entity:         entitySavedAttempt,
		UserID:         userID,
		SavedProblemID: item.SavedProblemID,
		AttemptID:      attemptID,
		Status:         string(status),
		UpdatedAt:      updatedAt,
		PassCount:      input.PassCount,
		FailCount:      input.FailCount,
		RuntimeMS:      input.RuntimeMS,
		Code:           input.Code,
		CodeS3Key:      input.CodeS3Key,
		SubmittedAt:    input.SubmittedAt,
		GSI1PK:         gsi1pk,
		GSI1SK:         gsi1sk,
		GSI2PK:         gsi2pk,
		GSI2SK:         gsi2sk,
	}

	attemptAV, err := attributevalue.MarshalMap(attemptItem)
	if err != nil {
		return domain.SavedAttemptSnapshot{}, fmt.Errorf("dynamo store: encode attempt: %w", err)
	}

	if _, err := s.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           &s.tableName,
		Item:                attemptAV,
		ConditionExpression: aws.String("attribute_not_exists(pk) AND attribute_not_exists(sk)"),
	}); err != nil {
		var condErr *types.ConditionalCheckFailedException
		if errors.As(err, &condErr) {
			return domain.SavedAttemptSnapshot{}, api.ErrBadRequest
		}
		return domain.SavedAttemptSnapshot{}, fmt.Errorf("dynamo store: put attempt: %w", err)
	}

	if err := s.putSavedProblemItem(ctx, item); err != nil {
		return domain.SavedAttemptSnapshot{}, err
	}

	return domain.SavedAttemptSnapshot{
		SavedAttemptSummary: domain.SavedAttemptSummary{
			AttemptID: attemptID,
			Status:    status,
			UpdatedAt: updatedAt,
			PassCount: input.PassCount,
			FailCount: input.FailCount,
		},
		SubmittedAt: input.SubmittedAt,
		RuntimeMS:   input.RuntimeMS,
		Code:        input.Code,
		CodeS3Key:   input.CodeS3Key,
	}, nil
}

// ListAttempts returns attempt snapshots for a saved problem.
func (s *DynamoUserDataStore) ListAttempts(ctx context.Context, userID, savedProblemID string) ([]domain.SavedAttemptSnapshot, error) {
	item, err := s.fetchSavedProblemItem(ctx, userID, savedProblemID)
	if err != nil {
		return nil, err
	}
	return s.listAttemptsInternal(ctx, item)
}

func (s *DynamoUserDataStore) listAttemptsInternal(ctx context.Context, parent savedProblemItem) ([]domain.SavedAttemptSnapshot, error) {
	out, err := s.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              &s.tableName,
		KeyConditionExpression: aws.String("pk = :pk AND begins_with(sk, :prefix)"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":pk":     &types.AttributeValueMemberS{Value: savedProblemPartitionKey(parent.SavedProblemID)},
			":prefix": &types.AttributeValueMemberS{Value: "ATTEMPT#"},
		},
		ScanIndexForward: aws.Bool(false),
	})
	if err != nil {
		return nil, fmt.Errorf("dynamo store: list attempts: %w", err)
	}

	if len(out.Items) == 0 {
		return []domain.SavedAttemptSnapshot{}, nil
	}

	var items []savedAttemptItem
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &items); err != nil {
		return nil, fmt.Errorf("dynamo store: decode attempts: %w", err)
	}

	snapshots := make([]domain.SavedAttemptSnapshot, 0, len(items))
	for _, item := range items {
		snapshots = append(snapshots, toDomainAttemptSnapshot(item))
	}

	return snapshots, nil
}

func toDomainProfile(item userProfileItem) domain.UserProfile {
	prefs := item.Preferences
	if prefs == nil {
		prefs = map[string]string{}
	}
	return domain.UserProfile{
		UserID:      item.UserID,
		Handle:      item.Handle,
		DisplayName: item.DisplayName,
		Bio:         item.Bio,
		AvatarURL:   item.AvatarURL,
		Timezone:    item.Timezone,
		Preferences: prefs,
		CreatedAt:   item.CreatedAt,
		UpdatedAt:   item.UpdatedAt,
	}
}

func toDomainSavedProblemSummary(item savedProblemItem) domain.SavedProblemSummary {
	summary := domain.SavedProblemSummary{
		ID:           item.SavedProblemID,
		ProblemID:    item.ProblemID,
		Title:        item.Title,
		Language:     item.Language,
		Status:       domain.SavedProblemStatus(item.Status),
		Tags:         append([]string(nil), item.Tags...),
		Notes:        item.Notes,
		HintUnlocked: item.HintUnlocked,
		CreatedAt:    item.CreatedAt,
		UpdatedAt:    item.UpdatedAt,
	}

	if item.LastAttemptID != "" {
		summary.LastAttempt = &domain.SavedAttemptSnapshot{
			SavedAttemptSummary: domain.SavedAttemptSummary{
				AttemptID: item.LastAttemptID,
				Status:    domain.SavedAttemptStatus(item.LastAttemptStatus),
				UpdatedAt: item.LastAttemptUpdatedAt,
				PassCount: item.LastAttemptPassCount,
				FailCount: item.LastAttemptFailCount,
			},
			SubmittedAt: item.LastAttemptSubmittedAt,
			RuntimeMS:   item.LastAttemptRuntimeMS,
			Code:        item.LastAttemptCode,
			CodeS3Key:   item.LastAttemptCodeS3Key,
		}
	}

	return summary
}

func toDomainAttemptSnapshot(item savedAttemptItem) domain.SavedAttemptSnapshot {
	return domain.SavedAttemptSnapshot{
		SavedAttemptSummary: domain.SavedAttemptSummary{
			AttemptID: item.AttemptID,
			Status:    domain.SavedAttemptStatus(item.Status),
			UpdatedAt: item.UpdatedAt,
			PassCount: item.PassCount,
			FailCount: item.FailCount,
		},
		SubmittedAt: item.SubmittedAt,
		RuntimeMS:   item.RuntimeMS,
		Code:        item.Code,
		CodeS3Key:   item.CodeS3Key,
	}
}

func normalizeTags(tags []string) []string {
	if len(tags) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(tags))
	normalized := make([]string, 0, len(tags))
	for _, tag := range tags {
		trimmed := strings.TrimSpace(tag)
		if trimmed == "" {
			continue
		}
		lower := strings.ToLower(trimmed)
		if _, ok := seen[lower]; ok {
			continue
		}
		seen[lower] = struct{}{}
		normalized = append(normalized, trimmed)
	}
	sort.Strings(normalized)
	if len(normalized) == 0 {
		return nil
	}
	return normalized
}
