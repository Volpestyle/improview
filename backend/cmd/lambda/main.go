//go:build lambda

package main

import (
	"context"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	adapter "github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"

	"improview/backend/internal/api"
	"improview/backend/internal/app"
)

func main() {
	services := app.NewInMemoryServices(api.RealClock{})
	handler := api.NewServer(services).Handler()
	lambdaAdapter := adapter.New(handler)

	lambda.Start(func(ctx context.Context, event events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		return lambdaAdapter.ProxyWithContext(ctx, event)
	})
}
