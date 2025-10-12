import tokens from '../../../../tokens/tokens.json';

type TokenPrimitive = string | number;
type TokenValue = TokenPrimitive | TokenDictionary;
export interface TokenDictionary {
  [key: string]: TokenValue;
}

export type DesignTokens = typeof tokens;

const toCssVarName = (path: string[]) => `--${path.join('-')}`;

const flattenTokens = (
  input: TokenDictionary,
  prefix: string[] = [],
  acc: Record<string, string> = {},
): Record<string, string> => {
  for (const [key, value] of Object.entries(input)) {
    const nextPath = [...prefix, key.replace(/_/g, '-')];
    if (typeof value === 'object' && value !== null) {
      flattenTokens(value as TokenDictionary, nextPath, acc);
    } else {
      const cssVar = toCssVarName(nextPath);
      acc[cssVar] = String(value);
    }
  }
  return acc;
};

export const tokenMap = flattenTokens(tokens as TokenDictionary);

export const applyTokenTheme = ({
  scope,
  overrideTokens,
}: {
  scope?: HTMLElement | null;
  overrideTokens?: TokenDictionary;
} = {}) => {
  if (typeof document === 'undefined') {
    return;
  }

  const target = scope ?? document.documentElement;
  if (!target) {
    return;
  }

  const flattened = overrideTokens
    ? flattenTokens(overrideTokens as TokenDictionary)
    : tokenMap;

  Object.entries(flattened).forEach(([name, value]) => {
    target.style.setProperty(name, value);
  });
};

export const getTokenValue = (path: string): string | undefined => {
  const key = `--${path.replace(/\./g, '-')}`;
  return tokenMap[key];
};

export { tokens };
