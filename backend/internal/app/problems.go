package app

import (
	"context"
	"fmt"
	"strings"
	"sync"

	"improview/backend/internal/api"
	"improview/backend/internal/domain"
)

// categoryToMacroCategory maps specific categories to their macro categories.
var categoryToMacroCategory = map[string]string{
	// DSA categories
	"arrays":        "dsa",
	"bfs-dfs":       "dsa",
	"maps-sets":     "dsa",
	"dp":            "dsa",
	"graphs":        "dsa",
	"strings":       "dsa",
	"math":          "dsa",
	"heaps":         "dsa",
	"two-pointers":  "dsa",

	// Frontend categories
	"react-components":  "frontend",
	"css-layouts":       "frontend",
	"accessibility":     "frontend",
	"state-management":  "frontend",
	"performance":       "frontend",
	"forms-validation":  "frontend",

	// System design categories
	"scalability":     "system-design",
	"databases":       "system-design",
	"caching":         "system-design",
	"load-balancing":  "system-design",
	"microservices":   "system-design",
	"api-design":      "system-design",
}

// getMacroCategory returns the macro category for a given specific category.
// Returns "dsa" as default if category is not found.
func getMacroCategory(category string) string {
	if macro, ok := categoryToMacroCategory[strings.ToLower(category)]; ok {
		return macro
	}
	return "dsa" // default fallback
}

// StaticProblemGenerator returns predefined problem packs for initial development.
type StaticProblemGenerator struct {
	packs map[string]domain.ProblemPack
}

// NewStaticProblemGenerator seeds a handful of example problems.
func NewStaticProblemGenerator() *StaticProblemGenerator {
	return &StaticProblemGenerator{packs: defaultProblemPacks()}
}

// Generate selects a problem pack that matches the requested category and difficulty.
func (g *StaticProblemGenerator) Generate(_ context.Context, req api.GenerateRequest) (domain.ProblemPack, error) {
	if g == nil {
		return domain.ProblemPack{}, api.ErrNotImplemented
	}

	category := strings.ToLower(strings.TrimSpace(req.Category))
	difficulty := strings.ToLower(strings.TrimSpace(req.Difficulty))
	key := fmt.Sprintf("%s:%s", category, difficulty)

	if pack, ok := g.packs[key]; ok {
		return cloneProblemPack(pack), nil
	}

	if pack, ok := g.packs["random:easy"]; ok {
		return cloneProblemPack(pack), nil
	}

	return domain.ProblemPack{}, api.ErrNotFound
}

// MemoryProblemRepository keeps generated problems available for later lookup.
type MemoryProblemRepository struct {
	mu    sync.RWMutex
	store map[string]domain.ProblemPack
}

// NewMemoryProblemRepository creates an empty in-memory repository.
func NewMemoryProblemRepository() *MemoryProblemRepository {
	return &MemoryProblemRepository{store: make(map[string]domain.ProblemPack)}
}

// Save persists the provided pack and returns a generated identifier.
func (r *MemoryProblemRepository) Save(_ context.Context, pack domain.ProblemPack) (string, error) {
	if r == nil {
		return "", api.ErrNotImplemented
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	id := randomID()
	r.store[id] = cloneProblemPack(pack)
	return id, nil
}

// Get fetches a previously saved problem pack.
func (r *MemoryProblemRepository) Get(_ context.Context, id string) (domain.ProblemPack, error) {
	if r == nil {
		return domain.ProblemPack{}, api.ErrNotImplemented
	}

	r.mu.RLock()
	defer r.mu.RUnlock()

	pack, ok := r.store[id]
	if !ok {
		return domain.ProblemPack{}, api.ErrNotFound
	}
	return cloneProblemPack(pack), nil
}

func defaultProblemPacks() map[string]domain.ProblemPack {
	return map[string]domain.ProblemPack{
		"bfs:easy": {
			Problem: domain.ProblemMetadata{
				Title:     "Shortest Path in Grid",
				Statement: "Given a binary matrix, compute the shortest path from the top-left corner to the bottom-right corner using BFS.",
				Constraints: []string{
					"1 <= rows, cols <= 30",
					"Grid cells contain 0 (walkable) or 1 (blocked)",
				},
				Examples: []domain.Example{
					{Input: []any{[][]int{{0, 0, 1}, {1, 0, 0}, {1, 0, 0}}}, Output: 4, Explanation: "Go right, down, down, right."},
				},
				EdgeCases: []string{"Single cell grid", "No path exists"},
			},
			API: domain.APISignature{
				FunctionName: "shortestPath",
				Signature:    "function shortestPath(grid)",
				Params:       []domain.APIParam{{Name: "grid", Type: "number[][]", Desc: "Binary matrix"}},
				Returns:      domain.APIParamReturn{Type: "number", Desc: "Length of the shortest path or -1"},
			},
			TimeEstimateMins: 20,
			Hint:             "Classic BFS from the source cell; queue holds positions and distances.",
			Solutions: []domain.SolutionOutline{
				{
					Approach:   "Breadth-first search",
					Complexity: domain.Complexity{Time: "O(n*m)", Space: "O(n*m)"},
					Code:       "function shortestPath(grid) { /* ... */ }",
				},
			},
			Tests: domain.TestSuite{
				Public: []domain.Example{
					{Input: []any{[][]int{{0, 0}, {0, 0}}}, Output: 3},
				},
				Hidden: []domain.Example{
					{Input: []any{[][]int{{0, 1}, {0, 0}}}, Output: 3},
				},
			},
			MacroCategory: getMacroCategory("bfs-dfs"),
		},
		"random:easy": {
			Problem: domain.ProblemMetadata{
				Title:     "Two Sum",
				Statement: "Return indices of the two numbers that add up to target.",
				Constraints: []string{
					"2 <= nums.length <= 10^4",
					"-10^9 <= nums[i] <= 10^9",
				},
				Examples: []domain.Example{
					{Input: []any{[]int{2, 7, 11, 15}, 9}, Output: []int{0, 1}},
				},
				EdgeCases: []string{"No answer", "Duplicate numbers"},
			},
			API: domain.APISignature{
				FunctionName: "twoSum",
				Signature:    "function twoSum(nums, target)",
				Params: []domain.APIParam{
					{Name: "nums", Type: "number[]", Desc: "Array of integers"},
					{Name: "target", Type: "number", Desc: "Desired sum"},
				},
				Returns: domain.APIParamReturn{Type: "number[]", Desc: "Indices of the matching pair"},
			},
			TimeEstimateMins: 15,
			Hint:             "Use a hash map to record values seen so far.",
			Solutions: []domain.SolutionOutline{
				{
					Approach:   "Hash map lookup",
					Complexity: domain.Complexity{Time: "O(n)", Space: "O(n)"},
					Code:       "function twoSum(nums, target) { /* ... */ }",
				},
			},
			Tests: domain.TestSuite{
				Public: []domain.Example{{Input: []any{[]int{1, 3, 4, 2}, 6}, Output: []int{1, 3}}},
				Hidden: []domain.Example{{Input: []any{[]int{-1, -2, -3, -4, -5}, -8}, Output: []int{2, 4}}},
			},
			MacroCategory: "dsa", // default for random problems
		},
	}
}

func cloneProblemPack(src domain.ProblemPack) domain.ProblemPack {
	clone := src
	clone.Problem.Constraints = append([]string(nil), src.Problem.Constraints...)
	clone.Problem.EdgeCases = append([]string(nil), src.Problem.EdgeCases...)
	clone.Problem.Examples = append([]domain.Example(nil), src.Problem.Examples...)
	clone.Solutions = append([]domain.SolutionOutline(nil), src.Solutions...)
	clone.Tests.Public = append([]domain.Example(nil), src.Tests.Public...)
	clone.Tests.Hidden = append([]domain.Example(nil), src.Tests.Hidden...)
	clone.API.Params = append([]domain.APIParam(nil), src.API.Params...)
	if src.WorkspaceTemplate != nil {
		tmpl := *src.WorkspaceTemplate
		if src.WorkspaceTemplate.Files != nil {
			tmpl.Files = make(map[string]domain.WorkspaceFile, len(src.WorkspaceTemplate.Files))
			for path, file := range src.WorkspaceTemplate.Files {
				tmpl.Files[path] = file
			}
		}
		if src.WorkspaceTemplate.Dependencies != nil {
			tmpl.Dependencies = make(map[string]string, len(src.WorkspaceTemplate.Dependencies))
			for dep, version := range src.WorkspaceTemplate.Dependencies {
				tmpl.Dependencies[dep] = version
			}
		}
		if src.WorkspaceTemplate.DevDependencies != nil {
			tmpl.DevDependencies = make(map[string]string, len(src.WorkspaceTemplate.DevDependencies))
			for dep, version := range src.WorkspaceTemplate.DevDependencies {
				tmpl.DevDependencies[dep] = version
			}
		}
		clone.WorkspaceTemplate = &tmpl
	}
	return clone
}
