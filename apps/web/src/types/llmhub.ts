export const Provider = {
  OpenAI: "openai",
  Anthropic: "anthropic",
  XAI: "xai",
  Google: "google",
} as const;

export type Provider = (typeof Provider)[keyof typeof Provider];

export type ModelCapabilities = {
  text: boolean;
  vision: boolean;
  tool_use: boolean;
  structured_output: boolean;
  reasoning: boolean;
};

export type TokenPrices = {
  input?: number;
  output?: number;
};

export type ModelMetadata = {
  id: string;
  displayName: string;
  provider: Provider;
  family?: string;
  capabilities: ModelCapabilities;
  contextWindow?: number;
  tokenPrices?: TokenPrices;
  deprecated?: boolean;
  inPreview?: boolean;
};
