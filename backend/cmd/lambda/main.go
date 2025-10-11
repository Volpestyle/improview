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
	services, err := app.NewServicesFromEnv(api.RealClock{})
	if err != nil {
		panic(err)
	}
	handler := api.NewServer(services).Handler()
	lambdaAdapter := adapter.NewV2(handler)

	lambda.Start(func(ctx context.Context, event events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
		return lambdaAdapter.ProxyWithContext(ctx, event)
	})
}
