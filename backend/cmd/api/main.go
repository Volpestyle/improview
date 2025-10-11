package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"improview/backend/internal/api"
	"improview/backend/internal/app"
)

func main() {
	clock := api.RealClock{}
	services := app.NewInMemoryServices(clock)

	srv := &http.Server{
		Addr:         ":" + getEnv("PORT", "8080"),
		Handler:      api.NewServer(services).Handler(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("improview backend listening on %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("api: failed to start server: %v", err)
		}
	}()

	sig := <-shutdown
	log.Printf("improview backend received signal %s, initiating shutdown", sig)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("api: graceful shutdown failed: %v", err)
	}

	log.Print("improview backend stopped")
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
