package app

import (
	"context"
	"errors"
	"strings"

	"improview/backend/internal/api"
	"improview/backend/internal/domain"
)

// DynamicProblemGenerator chooses between static and LLM generators on each request.
type DynamicProblemGenerator struct {
	defaultMode GeneratorMode
	static      api.ProblemGenerator
	llm         api.ProblemGenerator
}

// NewDynamicProblemGenerator constructs a generator that can switch per request.
func NewDynamicProblemGenerator(defaultMode GeneratorMode, staticGen api.ProblemGenerator, llmGen api.ProblemGenerator) (*DynamicProblemGenerator, error) {
	if staticGen == nil {
		return nil, errors.New("dynamic generator: static generator is required")
	}

	mode := defaultMode
	if mode == "" {
		mode = GeneratorModeStatic
	}
	if mode == GeneratorModeLLM && llmGen == nil {
		return nil, errors.New("dynamic generator: default mode llm but llm generator is nil")
	}

	return &DynamicProblemGenerator{
		defaultMode: mode,
		static:      staticGen,
		llm:         llmGen,
	}, nil
}

// Generate routes to the requested generator, falling back to the default.
func (g *DynamicProblemGenerator) Generate(ctx context.Context, req api.GenerateRequest) (domain.ProblemPack, error) {
	if g == nil {
		return domain.ProblemPack{}, api.ErrNotImplemented
	}

	mode := g.selectMode(req.Mode)
	switch mode {
	case GeneratorModeLLM:
		if g.llm != nil {
			return g.llm.Generate(ctx, req)
		}
	case GeneratorModeStatic:
		return g.static.Generate(ctx, req)
	}

	if g.defaultMode == GeneratorModeLLM && g.llm != nil {
		return g.llm.Generate(ctx, req)
	}
	return g.static.Generate(ctx, req)
}

func (g *DynamicProblemGenerator) selectMode(requested string) GeneratorMode {
	mode := GeneratorMode(strings.ToLower(strings.TrimSpace(requested)))
	switch mode {
	case GeneratorModeLLM:
		if g.llm != nil {
			return GeneratorModeLLM
		}
	case GeneratorModeStatic:
		return GeneratorModeStatic
	}

	mode = g.defaultMode
	if mode == GeneratorModeLLM && g.llm == nil {
		return GeneratorModeStatic
	}
	if mode == "" {
		return GeneratorModeStatic
	}
	return mode
}
