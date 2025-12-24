.PHONY: dev ci update-llmhub clean

# Local development: creates go.work to use local llmhub
dev:
	@echo "Setting up local development with local llmhub..."
	@echo "go 1.23" > go.work
	@echo "" >> go.work
	@echo "use (" >> go.work
	@echo "	." >> go.work
	@echo "	../../llmhub" >> go.work
	@echo ")" >> go.work
	@echo "Local development ready. go.work created to use local llmhub."

# CI: fetch latest llmhub from GitHub
ci:
	@echo "Fetching latest llmhub from GitHub..."
	@rm -f go.work
	GOPROXY=direct go get github.com/Volpestyle/llmhub@main
	go mod tidy
	@echo "llmhub updated to latest."

# Update llmhub to latest (alias for ci)
update-llmhub: ci

# Clean up local development artifacts
clean:
	@rm -f go.work
	@echo "Cleaned up local development artifacts."
