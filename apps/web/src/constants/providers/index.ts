import { Provider } from '@llmhub/core/types';

export type ProviderModelOption = {
  value: string;
  label: string;
};

export type ProviderCatalogEntry = {
  provider: Provider;
  displayName: string;
  models: ProviderModelOption[];
};

export const supportedProviders: Provider[] = [
  Provider.OpenAI,
  Provider.XAI,
  Provider.Anthropic,
  Provider.Google,
];
export const providerLabels: Record<Provider, string> = {
  [Provider.OpenAI]: 'OpenAI',
  [Provider.XAI]: 'Grok (xAI)',
  [Provider.Anthropic]: 'Anthropic Claude',
  [Provider.Google]: 'Google Gemini',
};

export const providerOptions = supportedProviders.map((provider) => ({
  value: provider,
  label: providerLabels[provider],
}));
