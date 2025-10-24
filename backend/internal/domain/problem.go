package domain

// Example represents one illustrative or test case for a generated problem.
type Example struct {
	Input       []any  `json:"input"`
	Output      any    `json:"output"`
	Explanation string `json:"explanation,omitempty"`
}

// ProblemMetadata contains the human-readable statement and constraints.
type ProblemMetadata struct {
	Title       string    `json:"title"`
	Statement   string    `json:"statement"`
	Constraints []string  `json:"constraints"`
	Examples    []Example `json:"examples"`
	EdgeCases   []string  `json:"edge_cases"`
}

// APISignature describes the expected function signature for the solution code.
type APISignature struct {
	FunctionName string         `json:"function_name"`
	Signature    string         `json:"signature"`
	Params       []APIParam     `json:"params"`
	Returns      APIParamReturn `json:"returns"`
}

// APIParam captures an argument description.
type APIParam struct {
	Name string `json:"name"`
	Type string `json:"type"`
	Desc string `json:"desc"`
}

// APIParamReturn captures the return description.
type APIParamReturn struct {
	Type string `json:"type"`
	Desc string `json:"desc"`
}

// SolutionOutline represents an example solution with complexity metadata.
type SolutionOutline struct {
	Approach   string     `json:"approach"`
	Complexity Complexity `json:"complexity"`
	Code       string     `json:"code"`
}

// Complexity describes Big-O characteristics of a solution.
type Complexity struct {
	Time  string `json:"time"`
	Space string `json:"space"`
}

// TestSuite groups public and hidden tests for a generated problem.
type TestSuite struct {
	Public []Example `json:"public"`
	Hidden []Example `json:"hidden"`
}

// WorkspaceFile represents a starter file within the interactive sandbox.
type WorkspaceFile struct {
	Code   string `json:"code"`
	Hidden bool   `json:"hidden,omitempty"`
}

// WorkspaceTemplate defines the initial multi-file sandbox configuration.
type WorkspaceTemplate struct {
	Entry           string                   `json:"entry"`
	Files           map[string]WorkspaceFile `json:"files"`
	Dependencies    map[string]string        `json:"dependencies,omitempty"`
	DevDependencies map[string]string        `json:"dev_dependencies,omitempty"`
	Template        string                   `json:"template,omitempty"`
	Environment     string                   `json:"environment,omitempty"`
}

// ProblemPack is the full payload returned by the LLM broker.
type ProblemPack struct {
	Problem           ProblemMetadata    `json:"problem"`
	API               APISignature       `json:"api"`
	TimeEstimateMins  int                `json:"time_estimate_minutes"`
	Hint              string             `json:"hint"`
	Solutions         []SolutionOutline  `json:"solutions"`
	Tests             TestSuite          `json:"tests"`
	MacroCategory     string             `json:"macro_category"`
	WorkspaceTemplate *WorkspaceTemplate `json:"workspace_template,omitempty"`
}

// Attempt captures stored attempt metadata.
type Attempt struct {
	ID         string `json:"id"`
	ProblemID  string `json:"problem_id"`
	UserID     string `json:"user_id"`
	Language   string `json:"lang"`
	StartedAt  int64  `json:"started_at"`
	EndedAt    int64  `json:"ended_at"`
	HintUsed   bool   `json:"hint_used"`
	PassCount  int    `json:"pass_count"`
	FailCount  int    `json:"fail_count"`
	DurationMS int64  `json:"duration_ms"`
}

// RunResult captures output from executing a single test case.
type RunResult struct {
	TestID string `json:"test_id"`
	Status string `json:"status"`
	TimeMS int64  `json:"time_ms"`
	Stdout string `json:"stdout"`
	Stderr string `json:"stderr"`
}

// RunSummary groups multiple run results.
type RunSummary struct {
	AttemptID string      `json:"attempt_id"`
	Results   []RunResult `json:"results"`
}

// SubmissionSummary contains outcome metrics after running hidden tests.
type SubmissionSummary struct {
	AttemptID     string      `json:"attempt_id"`
	Passed        bool        `json:"passed"`
	RuntimeMS     int64       `json:"runtime_ms"`
	Operations    int64       `json:"operations"`
	HiddenResults []RunResult `json:"hidden_results"`
}
