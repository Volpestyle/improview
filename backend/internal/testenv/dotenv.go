package testenv

import (
	"bufio"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

var (
	mu         sync.Mutex
	onceByFile = make(map[string]*sync.Once)
)

// LoadOnce loads environment variables from the provided .env-style files at most once per filename.
// Existing process environment variables are never overwritten. Missing files are ignored.
func LoadOnce(filenames ...string) error {
	for _, name := range filenames {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}

		resolved, err := resolvePath(name)
		if err != nil {
			return err
		}
		if resolved == "" {
			continue
		}

		once := getOnceForFile(resolved)

		var loadErr error
		once.Do(func() {
			loadErr = loadFile(resolved)
		})
		if loadErr != nil {
			return loadErr
		}
	}
	return nil
}

func getOnceForFile(filename string) *sync.Once {
	mu.Lock()
	defer mu.Unlock()

	if once, ok := onceByFile[filename]; ok {
		return once
	}

	once := &sync.Once{}
	onceByFile[filename] = once
	return once
}

func loadFile(filename string) error {
	file, err := os.Open(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		line = stripInlineComment(line)
		if line == "" {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		if key == "" || os.Getenv(key) != "" {
			continue
		}

		value := strings.TrimSpace(parts[1])
		if len(value) >= 2 {
			if strings.HasPrefix(value, `"`) && strings.HasSuffix(value, `"`) {
				value = value[1 : len(value)-1]
			} else if strings.HasPrefix(value, `'`) && strings.HasSuffix(value, `'`) {
				value = value[1 : len(value)-1]
			}
		}

		if err := os.Setenv(key, value); err != nil {
			return err
		}
	}

	if err := scanner.Err(); err != nil {
		return err
	}
	return nil
}

func stripInlineComment(line string) string {
	var builder strings.Builder
	var inSingle, inDouble bool

	for i := 0; i < len(line); i++ {
		ch := line[i]
		switch ch {
		case '#':
			if !inSingle && !inDouble {
				return strings.TrimSpace(builder.String())
			}
		case '\'':
			if !inDouble {
				inSingle = !inSingle
			}
		case '"':
			if !inSingle {
				inDouble = !inDouble
			}
		}
		builder.WriteByte(ch)
	}

	return strings.TrimSpace(builder.String())
}

func resolvePath(name string) (string, error) {
	if filepath.IsAbs(name) {
		if _, err := os.Stat(name); err != nil {
			if errors.Is(err, os.ErrNotExist) {
				return "", nil
			}
			return "", err
		}
		return filepath.Clean(name), nil
	}

	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	dir := wd
	for {
		candidate := filepath.Join(dir, name)
		if _, statErr := os.Stat(candidate); statErr == nil {
			return filepath.Clean(candidate), nil
		} else if !errors.Is(statErr, os.ErrNotExist) {
			return "", statErr
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	return "", nil
}
