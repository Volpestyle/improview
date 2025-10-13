package app

import (
	"context"
	"testing"

	"improview/backend/internal/api"
	"improview/backend/internal/domain"
)

type stubProblemGenerator struct {
	name string
}

func (s stubProblemGenerator) Generate(context.Context, api.GenerateRequest) (domain.ProblemPack, error) {
	return domain.ProblemPack{Hint: s.name}, nil
}

func TestDynamicProblemGeneratorDefaultsToStatic(t *testing.T) {
	static := stubProblemGenerator{name: "static"}
	gen, err := NewDynamicProblemGenerator(GeneratorModeStatic, static, nil)
	if err != nil {
		t.Fatalf("create dynamic generator: %v", err)
	}

	pack, err := gen.Generate(context.Background(), api.GenerateRequest{})
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	if pack.Hint != "static" {
		t.Fatalf("expected static generator, got %q", pack.Hint)
	}
}

func TestDynamicProblemGeneratorUsesLLMOnRequest(t *testing.T) {
	static := stubProblemGenerator{name: "static"}
	llm := stubProblemGenerator{name: "llm"}

	gen, err := NewDynamicProblemGenerator(GeneratorModeStatic, static, llm)
	if err != nil {
		t.Fatalf("create dynamic generator: %v", err)
	}

	pack, err := gen.Generate(context.Background(), api.GenerateRequest{Mode: "llm"})
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	if pack.Hint != "llm" {
		t.Fatalf("expected llm generator, got %q", pack.Hint)
	}
}

func TestDynamicProblemGeneratorFallsBackWhenLLMUnavailable(t *testing.T) {
	static := stubProblemGenerator{name: "static"}

	gen, err := NewDynamicProblemGenerator(GeneratorModeStatic, static, nil)
	if err != nil {
		t.Fatalf("create dynamic generator: %v", err)
	}

	pack, err := gen.Generate(context.Background(), api.GenerateRequest{Mode: "llm"})
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	if pack.Hint != "static" {
		t.Fatalf("expected static fallback, got %q", pack.Hint)
	}
}

func TestDynamicProblemGeneratorRequiresLLMWhenDefault(t *testing.T) {
	static := stubProblemGenerator{name: "static"}

	_, err := NewDynamicProblemGenerator(GeneratorModeLLM, static, nil)
	if err == nil {
		t.Fatalf("expected error when defaulting to llm without llm generator")
	}
}
