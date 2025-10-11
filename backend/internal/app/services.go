package app

import "improview/backend/internal/api"

// NewInMemoryServices wires together a fully in-memory implementation of the API services.
func NewInMemoryServices(clock api.Clock) api.Services {
	generator := NewStaticProblemGenerator()
	problems := NewMemoryProblemRepository()
	attempts := NewMemoryAttemptStore(clock)
	runner := SimpleTestRunner{}
	submission := SubmissionService{Runner: runner, Attempts: attempts}

	if clock == nil {
		clock = api.RealClock{}
	}

	return api.Services{
		Generator:  generator,
		Problems:   problems,
		Attempts:   attempts,
		Tests:      runner,
		Submission: submission,
		Health:     nil,
		Clock:      clock,
	}
}
