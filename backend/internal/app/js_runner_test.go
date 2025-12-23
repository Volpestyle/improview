package app

import (
	"context"
	"testing"
	"time"

	"improview/backend/internal/api"
	"improview/backend/internal/domain"
)

func TestJavaScriptRunnerPassesPublicTests(t *testing.T) {
	runner, attemptID := setupRunner(t)

	code := `
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}
`

	summary, err := runner.Run(context.Background(), api.RunTestsRequest{
		AttemptID: attemptID,
		Code:      code,
		Which:     "public",
	})
	if err != nil {
		t.Fatalf("runner.Run returned error: %v", err)
	}
	if len(summary.Results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(summary.Results))
	}
	if summary.Results[0].Status != "pass" {
		t.Fatalf("expected pass status, got %s (stderr=%s)", summary.Results[0].Status, summary.Results[0].Stderr)
	}
}

func TestJavaScriptRunnerFailsHiddenTests(t *testing.T) {
	runner, attemptID := setupRunner(t)

	code := `
function twoSum(nums, target) {
  return [0, 0];
}
`
	summary, err := runner.Run(context.Background(), api.RunTestsRequest{
		AttemptID: attemptID,
		Code:      code,
		Which:     "hidden",
	})
	if err != nil {
		t.Fatalf("runner.Run returned error: %v", err)
	}
	if len(summary.Results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(summary.Results))
	}
	if summary.Results[0].Status != "fail" {
		t.Fatalf("expected fail status, got %s", summary.Results[0].Status)
	}
}

func TestJavaScriptRunnerReportsCompileErrors(t *testing.T) {
	runner, attemptID := setupRunner(t)

	code := `function twoSum(nums, target) { return [0,0; }`

	summary, err := runner.Run(context.Background(), api.RunTestsRequest{
		AttemptID: attemptID,
		Code:      code,
		Which:     "public",
	})
	if err != nil {
		t.Fatalf("runner.Run returned error: %v", err)
	}
	if len(summary.Results) != 1 {
		t.Fatalf("expected a single setup error result, got %d", len(summary.Results))
	}
	if summary.Results[0].Status != "error" {
		t.Fatalf("expected error status, got %s", summary.Results[0].Status)
	}
	if summary.Results[0].Stderr == "" {
		t.Fatalf("expected stderr message for compile error")
	}
}

func TestJavaScriptRunnerTimesOutInfiniteLoop(t *testing.T) {
	runner, attemptID := setupRunner(t)
	runner.PerTestTimeout = 20 * time.Millisecond

	code := `
function twoSum() {
  while (true) {}
}
`
	summary, err := runner.Run(context.Background(), api.RunTestsRequest{
		AttemptID: attemptID,
		Code:      code,
		Which:     "public",
	})
	if err != nil {
		t.Fatalf("runner.Run returned error: %v", err)
	}
	if len(summary.Results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(summary.Results))
	}
	if summary.Results[0].Status != "timeout" {
		t.Fatalf("expected timeout status, got %s", summary.Results[0].Status)
	}
}

func setupRunner(t *testing.T) (JavaScriptRunner, string) {
	t.Helper()

	problems := NewMemoryProblemRepository()
	attempts := NewMemoryAttemptStore(api.RealClock{})

	pack := domain.ProblemPack{
		API: domain.APISignature{
			FunctionName: "twoSum",
		},
		Tests: domain.TestSuite{
			Public: []domain.Example{
				{Input: []any{[]int{2, 7, 11, 15}, 9}, Output: []int{0, 1}},
			},
			Hidden: []domain.Example{
				{Input: []any{[]int{-1, -2, -3, -4, -5}, -8}, Output: []int{2, 4}},
			},
		},
	}

	problemID, err := problems.Save(context.Background(), pack)
	if err != nil {
		t.Fatalf("failed to seed problem: %v", err)
	}

	attempt, err := attempts.Create(context.Background(), api.CreateAttemptRequest{
		ProblemID: problemID,
		Language:  "javascript",
	})
	if err != nil {
		t.Fatalf("failed to create attempt: %v", err)
	}

	runner := JavaScriptRunner{
		Problems:       problems,
		Attempts:       attempts,
		PerTestTimeout: 200 * time.Millisecond,
	}
	return runner, attempt.ID
}
