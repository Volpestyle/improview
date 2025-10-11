package jsonfmt

import (
	"bytes"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
)

const (
	DefaultLogLimit  = 2048
	indentUnit       = "  "
	maxInlineArray   = 8
	maxInlineColumns = 80
)

var htmlUnescaper = strings.NewReplacer("\\u003c", "<", "\\u003e", ">", "\\u0026", "&")

// FormatForLog returns a readable representation of raw JSON, using Pretty when
// possible and falling back to truncated raw output when parsing fails.
func FormatForLog(raw []byte, limit int) string {
	if len(raw) == 0 {
		return ""
	}

	if pretty, ok := Prettify(raw); ok {
		return Snippet([]byte(pretty), limit)
	}

	return Snippet(raw, limit)
}

// Snippet returns the payload as a string, truncated to the provided limit.
func Snippet(raw []byte, limit int) string {
	if limit <= 0 || len(raw) <= limit {
		return string(raw)
	}
	if limit < 4 {
		return string(raw[:limit])
	}
	return string(raw[:limit-3]) + "..."
}

// Prettify attempts to format raw JSON with stable key ordering.
func Prettify(raw []byte) (string, bool) {
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 {
		return "", false
	}

	var target any
	if err := json.Unmarshal(trimmed, &target); err != nil {
		return "", false
	}

	return FormatValue(target), true
}

// Pretty exposes the prettified view when possible and returns the original
// bytes when parsing fails.
func Pretty(raw []byte) string {
	if pretty, ok := Prettify(raw); ok {
		return pretty
	}
	return string(raw)
}

// FormatValue renders an arbitrary JSON-compatible value with deterministic key
// ordering and compact inline lists where appropriate.
func FormatValue(value any) string {
	return formatValue(value, 0)
}

func formatValue(v any, depth int) string {
	switch val := v.(type) {
	case map[string]any:
		if len(val) == 0 {
			return "{}"
		}

		keys := make([]string, 0, len(val))
		for k := range val {
			keys = append(keys, k)
		}
		sort.Strings(keys)

		var b strings.Builder
		indent := strings.Repeat(indentUnit, depth)
		nextIndent := strings.Repeat(indentUnit, depth+1)

		b.WriteString("{\n")
		for i, k := range keys {
			b.WriteString(nextIndent)
			b.WriteString(quoteJSONString(k))
			b.WriteString(": ")
			b.WriteString(formatValue(val[k], depth+1))
			if i < len(keys)-1 {
				b.WriteString(",")
			}
			b.WriteString("\n")
		}
		b.WriteString(indent)
		b.WriteString("}")
		return b.String()
	case []any:
		if len(val) == 0 {
			return "[]"
		}
		if shouldInlineArray(val) {
			parts := make([]string, len(val))
			for i, el := range val {
				parts[i] = formatValue(el, 0)
			}
			return "[ " + strings.Join(parts, ", ") + " ]"
		}

		var b strings.Builder
		indent := strings.Repeat(indentUnit, depth)
		nextIndent := strings.Repeat(indentUnit, depth+1)

		b.WriteString("[\n")
		for i, el := range val {
			b.WriteString(nextIndent)
			b.WriteString(formatValue(el, depth+1))
			if i < len(val)-1 {
				b.WriteString(",")
			}
			b.WriteString("\n")
		}
		b.WriteString(indent)
		b.WriteString("]")
		return b.String()
	default:
		return formatScalar(val)
	}
}

func shouldInlineArray(values []any) bool {
	if len(values) == 0 || len(values) > maxInlineArray {
		return false
	}

	totalColumns := 2 // account for opening and closing brackets
	for i, v := range values {
		if !isSimpleScalar(v) {
			return false
		}

		segment := formatScalar(v)
		totalColumns += len(segment)
		if i < len(values)-1 {
			totalColumns += 2 // comma and space
		}
		if totalColumns > maxInlineColumns {
			return false
		}
	}

	return true
}

func isSimpleScalar(v any) bool {
	switch v.(type) {
	case string, float64, bool, nil:
		return true
	default:
		return false
	}
}

func formatScalar(v any) string {
	switch val := v.(type) {
	case string:
		return quoteJSONString(val)
	case float64:
		return strconv.FormatFloat(val, 'f', -1, 64)
	case bool:
		if val {
			return "true"
		}
		return "false"
	case nil:
		return "null"
	case map[string]any, []any:
		return formatValue(val, 0)
	default:
		b, err := json.Marshal(val)
		if err != nil {
			return fmt.Sprintf("%v", val)
		}
		return string(b)
	}
}

func quoteJSONString(value string) string {
	quoted := strconv.Quote(value)
	return htmlUnescaper.Replace(quoted)
}
