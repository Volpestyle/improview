package api_test

import (
	"fmt"
	"strings"

	"improview/backend/internal/domain"
)

func buildTwoSumSolution(functionName string) string {
	if strings.TrimSpace(functionName) == "" {
		functionName = "twoSum"
	}

	return fmt.Sprintf(`function %s(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }
    seen.set(nums[i], i);
  }
  return [];
}`, functionName)
}

func smokeSolutionForPack(pack domain.ProblemPack) (string, bool) {
	if code, ok := referenceSolutionByKind(pack.ReferenceSolutions, "optimal"); ok {
		return code, true
	}
	if code, ok := referenceSolutionByKind(pack.ReferenceSolutions, "baseline"); ok {
		return code, true
	}
	if len(pack.ReferenceSolutions) > 0 {
		return strings.TrimSpace(pack.ReferenceSolutions[0].Code), pack.ReferenceSolutions[0].Code != ""
	}

	fn := strings.TrimSpace(pack.API.FunctionName)
	title := strings.ToLower(strings.TrimSpace(pack.Problem.Title))

	if strings.EqualFold(fn, "twoSum") || strings.Contains(title, "two sum") {
		return buildTwoSumSolution(fn), true
	}

	return "", false
}

func referenceSolutionByKind(list []domain.ReferenceSolution, desired string) (string, bool) {
	if len(list) == 0 {
		return "", false
	}
	for _, ref := range list {
		if strings.EqualFold(ref.Kind, desired) {
			if trimmed := strings.TrimSpace(ref.Code); trimmed != "" {
				if ref.Language == "" || strings.EqualFold(ref.Language, "javascript") {
					return trimmed, true
				}
			}
		}
	}
	return "", false
}
