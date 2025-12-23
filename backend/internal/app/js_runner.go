package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/dop251/goja"

	"improview/backend/internal/api"
	"improview/backend/internal/domain"
)

const (
	defaultPerTestTimeout = 200 * time.Millisecond
	maxConsoleBytes       = 2048
)

var (
	errExecutionTimeout = errors.New("execution timed out")
)

// JavaScriptRunner executes problem packs with a lightweight embedded JS VM.
type JavaScriptRunner struct {
	Problems       api.ProblemRepository
	Attempts       api.AttemptStore
	PerTestTimeout time.Duration
}

// Run executes the requested test suite against the supplied source code.
func (r JavaScriptRunner) Run(ctx context.Context, req api.RunTestsRequest) (domain.RunSummary, error) {
	if r.Problems == nil || r.Attempts == nil {
		return domain.RunSummary{}, api.ErrNotImplemented
	}

	code := strings.TrimSpace(req.Code)
	if code == "" {
		return domain.RunSummary{}, api.ErrBadRequest
	}

	attempt, _, err := r.Attempts.Get(ctx, req.AttemptID)
	if err != nil {
		return domain.RunSummary{}, err
	}

	pack, err := r.Problems.Get(ctx, attempt.ProblemID)
	if err != nil {
		return domain.RunSummary{}, err
	}

	tests, err := selectTestExamples(pack.Tests, req.Which)
	if err != nil {
		return domain.RunSummary{}, err
	}

	summary := domain.RunSummary{
		AttemptID: req.AttemptID,
		Results:   make([]domain.RunResult, 0, len(tests)),
	}

	if len(tests) == 0 {
		return summary, nil
	}

	functionName := strings.TrimSpace(pack.API.FunctionName)
	if functionName == "" {
		functionName = "solve"
	}

	sandbox, err := newGojaSandbox(code, functionName, r.effectiveTimeout())
	if err != nil {
		summary.Results = append(summary.Results, setupFailureResult(req.Which, err))
		return summary, nil
	}

	for idx, example := range tests {
		select {
		case <-ctx.Done():
			return summary, ctx.Err()
		default:
		}

		result := sandbox.runExample(ctx, req.Which, idx, example)
		summary.Results = append(summary.Results, result)
	}

	return summary, nil
}

func (r JavaScriptRunner) effectiveTimeout() time.Duration {
	if r.PerTestTimeout <= 0 {
		return defaultPerTestTimeout
	}
	return r.PerTestTimeout
}

func selectTestExamples(suite domain.TestSuite, which string) ([]domain.Example, error) {
	switch strings.ToLower(strings.TrimSpace(which)) {
	case "", "public":
		return suite.Public, nil
	case "hidden":
		return suite.Hidden, nil
	default:
		return nil, api.ErrBadRequest
	}
}

type gojaSandbox struct {
	vm      *goja.Runtime
	fn      goja.Callable
	timeout time.Duration
	console *consoleRecorder
}

func newGojaSandbox(code, functionName string, timeout time.Duration) (*gojaSandbox, error) {
	vm := goja.New()

	recorder := newConsoleRecorder()
	recorder.install(vm)

	program, err := goja.Compile("solution.js", code, true)
	if err != nil {
		return nil, fmt.Errorf("compile error: %w", err)
	}
	if _, err := vm.RunProgram(program); err != nil {
		return nil, fmt.Errorf("runtime error: %w", err)
	}

	value := vm.Get(functionName)
	fn, ok := goja.AssertFunction(value)
	if !ok {
		return nil, fmt.Errorf("function %q is not defined", functionName)
	}

	return &gojaSandbox{
		vm:      vm,
		fn:      fn,
		timeout: timeout,
		console: recorder,
	}, nil
}

func (s *gojaSandbox) runExample(ctx context.Context, which string, index int, example domain.Example) domain.RunResult {
	testID := fmt.Sprintf("%s_%d", normalizeTestPrefix(which), index+1)
	result := domain.RunResult{
		TestID: testID,
		Status: "error",
	}

	stdoutBuf := &strings.Builder{}
	stderrBuf := &strings.Builder{}

	start := time.Now()
	value, err := s.call(ctx, example.Input, stdoutBuf, stderrBuf)
	result.TimeMS = time.Since(start).Milliseconds()
	result.Stdout = strings.TrimSpace(stdoutBuf.String())
	result.Stderr = strings.TrimSpace(stderrBuf.String())

	if errors.Is(err, errExecutionTimeout) {
		result.Status = "timeout"
		if result.Stderr == "" {
			result.Stderr = errExecutionTimeout.Error()
		}
		return result
	}
	if err != nil {
		result.Status = "error"
		if msg := err.Error(); msg != "" {
			if result.Stderr == "" {
				result.Stderr = msg
			} else {
				result.Stderr = strings.TrimSpace(result.Stderr + "\n" + msg)
			}
		}
		return result
	}

	match, cmpErr := compareValues(value.Export(), example.Output)
	if cmpErr != nil {
		result.Status = "error"
		result.Stderr = cmpErr.Error()
		return result
	}

	if match {
		result.Status = "pass"
		return result
	}

	result.Status = "fail"
	expectedJSON, _ := json.Marshal(example.Output)
	actualJSON, _ := json.Marshal(value.Export())
	diff := fmt.Sprintf("expected %s, received %s", string(expectedJSON), string(actualJSON))
	if result.Stderr == "" {
		result.Stderr = diff
	} else {
		result.Stderr = strings.TrimSpace(result.Stderr + "\n" + diff)
	}
	return result
}

func (s *gojaSandbox) call(ctx context.Context, inputs []any, stdout, stderr *strings.Builder) (goja.Value, error) {
	if ctx != nil {
		select {
		case <-ctx.Done():
			return goja.Undefined(), ctx.Err()
		default:
		}
	}

	args := make([]goja.Value, len(inputs))
	for i, input := range inputs {
		args[i] = s.vm.ToValue(input)
	}

	s.console.attach(stdout, stderr)
	defer s.console.attach(nil, nil)

	timer := time.AfterFunc(s.timeout, func() {
		s.vm.Interrupt(errExecutionTimeout)
	})
	defer func() {
		timer.Stop()
		s.vm.ClearInterrupt()
	}()

	value, err := s.fn(goja.Undefined(), args...)
	if err != nil {
		var interrupted *goja.InterruptedError
		if errors.As(err, &interrupted) && errors.Is(interrupted.Unwrap(), errExecutionTimeout) {
			return goja.Undefined(), errExecutionTimeout
		}
		return goja.Undefined(), err
	}

	return value, nil
}

type consoleRecorder struct {
	stdout boundedBuffer
	stderr boundedBuffer
}

func newConsoleRecorder() *consoleRecorder {
	return &consoleRecorder{
		stdout: boundedBuffer{limit: maxConsoleBytes},
		stderr: boundedBuffer{limit: maxConsoleBytes},
	}
}

func (r *consoleRecorder) install(vm *goja.Runtime) {
	console := map[string]func(goja.FunctionCall) goja.Value{
		"log":   r.writeStdout,
		"info":  r.writeStdout,
		"warn":  r.writeStdout,
		"error": r.writeStderr,
	}
	_ = vm.Set("console", console)
}

func (r *consoleRecorder) attach(stdout, stderr *strings.Builder) {
	r.stdout.attach(stdout)
	r.stderr.attach(stderr)
}

func (r *consoleRecorder) writeStdout(call goja.FunctionCall) goja.Value {
	r.stdout.writeLine(formatConsoleArgs(call.Arguments))
	return goja.Undefined()
}

func (r *consoleRecorder) writeStderr(call goja.FunctionCall) goja.Value {
	r.stderr.writeLine(formatConsoleArgs(call.Arguments))
	return goja.Undefined()
}

type boundedBuffer struct {
	builder *strings.Builder
	limit   int
}

func (b *boundedBuffer) attach(builder *strings.Builder) {
	b.builder = builder
}

func (b *boundedBuffer) writeLine(text string) {
	if b.builder == nil || b.limit <= 0 {
		return
	}

	remaining := b.limit - b.builder.Len()
	if remaining <= 0 {
		return
	}

	toWrite := text
	if len(toWrite)+1 > remaining {
		if remaining <= 1 {
			return
		}
		toWrite = toWrite[:remaining-1]
	}
	b.builder.WriteString(toWrite)
	b.builder.WriteByte('\n')
}

func formatConsoleArgs(args []goja.Value) string {
	if len(args) == 0 {
		return ""
	}

	parts := make([]string, len(args))
	for i, arg := range args {
		parts[i] = arg.String()
	}
	return strings.Join(parts, " ")
}

func compareValues(actual, expected interface{}) (bool, error) {
	a, err := json.Marshal(actual)
	if err != nil {
		return false, fmt.Errorf("failed to normalize result: %w", err)
	}
	b, err := json.Marshal(expected)
	if err != nil {
		return false, fmt.Errorf("failed to normalize expected value: %w", err)
	}
	return string(a) == string(b), nil
}

func normalizeTestPrefix(which string) string {
	prefix := strings.TrimSpace(which)
	if prefix == "" {
		return "public"
	}
	return prefix
}

func setupFailureResult(which string, err error) domain.RunResult {
	prefix := normalizeTestPrefix(which)
	return domain.RunResult{
		TestID: fmt.Sprintf("%s_setup", prefix),
		Status: "error",
		Stderr: err.Error(),
	}
}
