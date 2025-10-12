import { ChangeEvent, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Chip, Select, TextArea, useToast } from '@improview/ui';
import { apiClient } from '../../api/client';
import { ApiError } from '../../api/errors';
import { GenerateRequest } from '../../api/types';
import { recordAttemptStart } from '../../storage/history';

const categoryOptions = [
  { value: 'arrays', label: 'Arrays' },
  { value: 'bfs', label: 'BFS / DFS' },
  { value: 'maps', label: 'Maps & Sets' },
  { value: 'dp', label: 'Dynamic Programming' },
  { value: 'graphs', label: 'Graphs' },
  { value: 'strings', label: 'Strings' },
  { value: 'math', label: 'Math' },
  { value: 'heaps', label: 'Heaps' },
  { value: 'two_pointers', label: 'Two Pointers' },
];

const difficultyOptions = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'grok', label: 'Grok 4 Fast' },
];

export const HomePage = () => {
  const [category, setCategory] = useState(categoryOptions[1]?.value ?? 'bfs');
  const [difficulty, setDifficulty] = useState('medium');
  const [provider, setProvider] = useState(providerOptions[0]?.value ?? 'openai');
  const [customPrompt, setCustomPrompt] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { publish } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: GenerateRequest = {
        category,
        difficulty,
        provider,
      };
      if (customPrompt.trim()) {
        payload.customPrompt = customPrompt.trim();
      }

      const generateResponse = await apiClient.generate(payload);
      const attemptResponse = await apiClient.createAttempt({
        problem_id: generateResponse.problem_id,
        lang: 'typescript',
      });

      queryClient.setQueryData(['problem', generateResponse.problem_id], generateResponse.pack);
      queryClient.setQueryData(['attempt', attemptResponse.attempt.id], attemptResponse.attempt);
      queryClient.setQueryData(['runs', attemptResponse.attempt.id], []);

      recordAttemptStart({
        attemptId: attemptResponse.attempt.id,
        problemId: generateResponse.problem_id,
        problemTitle: generateResponse.pack.problem.title,
        category,
        difficulty,
        provider,
        createdAt: Date.now(),
        timeEstimateMinutes: generateResponse.pack.time_estimate_minutes,
      });

      return {
        attemptId: attemptResponse.attempt.id,
      };
    },
    onSuccess: async ({ attemptId }) => {
      publish({
        title: 'Problem generated',
        description: 'Your workspace is ready.',
        variant: 'success',
      });
      await navigate({ to: '/workspace/$attemptId', params: { attemptId } });
    },
    onError: (error) => {
      console.error(error);
      if (error instanceof ApiError && error.status === 401) {
        publish({
          title: 'Session expired',
          description: 'Please sign in again to generate a new workspace.',
          variant: 'error',
        });
        return;
      }
      publish({
        title: 'Generation failed',
        description: 'Please try again or switch providers.',
        variant: 'error',
      });
    },
  });

  const handleGenerate = () => {
    if (!mutation.isPending) {
      mutation.mutate();
    }
  };

  const handleProviderChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setProvider(event.target.value);
  };

  const handlePromptChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setCustomPrompt(event.target.value);
  };

  const handleClearPrompt = () => {
    setCustomPrompt('');
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 text-center sm:text-left">
        <span className="text-sm uppercase tracking-[0.3em] text-accent">Improview</span>
        <h1 className="text-3xl font-semibold text-fg sm:text-4xl">
          Generate interview-grade algorithm drills in seconds.
        </h1>
        <p className="text-lg text-fg-muted sm:max-w-2xl">
          Pick a category, difficulty, and provider. We&apos;ll craft a full problem pack with tests,
          hints, and a recommended time-box so you can focus on practicing.
        </p>
      </div>

      <Card heading="Configure your challenge" description="Selections persist locally for faster repeats." padding="lg">
        <div className="flex flex-col gap-8">
          <section aria-labelledby="category-heading" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="category-heading" className="text-md font-semibold text-fg">
                Category
              </h2>
              <span className="text-sm text-fg-muted">Choose one focus area</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {categoryOptions.map((option) => (
                <Chip
                  key={option.value}
                  variant={category === option.value ? 'accent' : 'default'}
                  selected={category === option.value}
                  onClick={() => setCategory(option.value)}
                  aria-pressed={category === option.value}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </section>

          <section aria-labelledby="difficulty-heading" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="difficulty-heading" className="text-md font-semibold text-fg">
                Difficulty
              </h2>
              <span className="text-sm text-fg-muted">Start at Medium for onboarding</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {difficultyOptions.map((option) => (
                <Chip
                  key={option.value}
                  variant={difficulty === option.value ? 'accent' : 'default'}
                  selected={difficulty === option.value}
                  onClick={() => setDifficulty(option.value)}
                  aria-pressed={difficulty === option.value}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <Select
              label="Provider"
              value={provider}
              onChange={handleProviderChange}
              options={providerOptions}
              supportingText="Provider hints help route requests to the right LLM broker."
            />
            <div className="flex flex-col gap-2">
              <TextArea
                label="Custom prompt"
                placeholder="Optional: Describe a specific scenario, constraints, or data shape."
                value={customPrompt}
                onChange={handlePromptChange}
                optional
              />
              {customPrompt ? (
                <div>
                  <Button variant="ghost" size="sm" onClick={handleClearPrompt}>
                    Clear prompt
                  </Button>
                </div>
              ) : null}
            </div>
          </section>

          <div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-bg-sunken p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1 text-sm text-fg-muted">
              <span className="font-medium text-fg">Run mode</span>
              <span>
                {import.meta.env.VITE_API_MODE === 'live'
                  ? 'Live requests against the deployed backend.'
                  : 'Using local mock responses for ultra-fast iteration.'}
              </span>
            </div>
            <Button size="lg" onClick={handleGenerate} loading={mutation.isPending}>
              {mutation.isPending ? 'Generating…' : 'Generate workspace'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
