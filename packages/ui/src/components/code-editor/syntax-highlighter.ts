/**
 * Simple JavaScript syntax highlighting for code editor
 * Returns HTML string with span elements for syntax highlighting
 */

export type SupportedLanguage = 'javascript' | 'typescript' | 'plaintext';

interface HighlightToken {
    type: 'keyword' | 'string' | 'comment' | 'number' | 'function' | 'operator' | 'punctuation' | 'text';
    value: string;
}

const KEYWORDS = new Set([
    'const',
    'let',
    'var',
    'function',
    'return',
    'if',
    'else',
    'for',
    'while',
    'do',
    'switch',
    'case',
    'break',
    'continue',
    'try',
    'catch',
    'finally',
    'throw',
    'new',
    'class',
    'extends',
    'import',
    'export',
    'from',
    'default',
    'async',
    'await',
    'typeof',
    'instanceof',
    'in',
    'of',
    'this',
    'super',
    'static',
    'get',
    'set',
]);

const tokenClassNames: Record<HighlightToken['type'], string> = {
    keyword: 'text-[var(--editor-token-keyword)]',
    string: 'text-[var(--editor-token-string)]',
    comment: 'text-[var(--editor-token-comment)] italic',
    number: 'text-[var(--editor-token-number)]',
    function: 'text-[var(--editor-token-function)]',
    operator: 'text-[var(--editor-token-operator)]',
    punctuation: 'text-[var(--editor-token-punctuation)]',
    text: 'text-[var(--editor-text)]',
};

function tokenize(code: string): HighlightToken[] {
    const tokens: HighlightToken[] = [];
    let i = 0;

    while (i < code.length) {
        const char = code[i];

        // Comments
        if (char === '/' && code[i + 1] === '/') {
            let comment = '//';
            i += 2;
            while (i < code.length && code[i] !== '\n') {
                comment += code[i];
                i++;
            }
            tokens.push({ type: 'comment', value: comment });
            continue;
        }

        if (char === '/' && code[i + 1] === '*') {
            let comment = '/*';
            i += 2;
            while (i < code.length - 1 && !(code[i] === '*' && code[i + 1] === '/')) {
                comment += code[i];
                i++;
            }
            if (i < code.length - 1) {
                comment += '*/';
                i += 2;
            }
            tokens.push({ type: 'comment', value: comment });
            continue;
        }

        // Strings
        if (char === '"' || char === "'" || char === '`') {
            const quote = char;
            let str = quote;
            i++;
            while (i < code.length && code[i] !== quote) {
                if (code[i] === '\\' && i + 1 < code.length) {
                    str += code[i] + code[i + 1];
                    i += 2;
                } else {
                    str += code[i];
                    i++;
                }
            }
            if (i < code.length) {
                str += code[i];
                i++;
            }
            tokens.push({ type: 'string', value: str });
            continue;
        }

        // Numbers
        if (/\d/.test(char)) {
            let num = '';
            while (i < code.length && /[\d.]/.test(code[i])) {
                num += code[i];
                i++;
            }
            tokens.push({ type: 'number', value: num });
            continue;
        }

        // Identifiers and keywords
        if (/[a-zA-Z_$]/.test(char)) {
            let word = '';
            while (i < code.length && /[a-zA-Z0-9_$]/.test(code[i])) {
                word += code[i];
                i++;
            }

            // Check if it's followed by parentheses (function call)
            let j = i;
            while (j < code.length && /\s/.test(code[j])) j++;
            const isFunction = code[j] === '(';

            if (KEYWORDS.has(word)) {
                tokens.push({ type: 'keyword', value: word });
            } else if (isFunction) {
                tokens.push({ type: 'function', value: word });
            } else {
                tokens.push({ type: 'text', value: word });
            }
            continue;
        }

        // Operators and punctuation
        if (/[+\-*/%=<>!&|^~?:]/.test(char)) {
            let op = char;
            i++;
            // Handle multi-character operators
            while (i < code.length && /[+\-*/%=<>!&|^~?:]/.test(code[i])) {
                op += code[i];
                i++;
            }
            tokens.push({ type: 'operator', value: op });
            continue;
        }

        if (/[()[\]{};,.]/.test(char)) {
            tokens.push({ type: 'punctuation', value: char });
            i++;
            continue;
        }

        // Whitespace and other characters
        tokens.push({ type: 'text', value: char });
        i++;
    }

    return tokens;
}

export function highlightCode(code: string, language: SupportedLanguage = 'javascript'): string {
    if (language === 'plaintext' || !code) {
        return code;
    }

    const tokens = tokenize(code);
    return tokens
        .map((token) => {
            const className = tokenClassNames[token.type];
            // Escape HTML entities
            const escaped = token.value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
            return `<span class="${className}">${escaped}</span>`;
        })
        .join('');
}

