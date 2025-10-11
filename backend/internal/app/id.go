package app

import (
	"crypto/rand"
	"encoding/hex"
	"strconv"
	"sync/atomic"
	"time"
)

var fallbackCounter uint64

func randomID() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err == nil {
		return hex.EncodeToString(buf)
	}

	counter := atomic.AddUint64(&fallbackCounter, 1)
	timestamp := time.Now().UnixNano()
	return strconv.FormatInt(timestamp, 16) + strconv.FormatUint(counter, 16)
}
