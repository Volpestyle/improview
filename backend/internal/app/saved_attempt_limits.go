package app

import (
	"fmt"

	"improview/backend/internal/api"
)

const (
	// maxSavedAttemptCodeBytes guards DynamoDB's 400 KB item limit while leaving headroom
	// for metadata duplicated across related items.
	maxSavedAttemptCodeBytes = 300 * 1024 // 300 KB
)

func validateSavedAttemptCode(code string) error {
	if len(code) == 0 {
		return nil
	}
	if len(code) > maxSavedAttemptCodeBytes {
		return fmt.Errorf("%w: attempt code exceeds %d KB limit", api.ErrBadRequest, maxSavedAttemptCodeBytes/1024)
	}
	return nil
}
