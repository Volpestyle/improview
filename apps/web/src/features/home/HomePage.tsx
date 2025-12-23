import { useState, useRef, useEffect, useMemo } from 'react';
import type React from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Select,
  Textarea,
  ThemeToggle,
  useToast,
  type SubmitResult,
  type TestResult as EditorTestResult,
} from '@improview/ui';
import { Sparkles, Loader2, BookMarked, LogOut, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../state/authStore';
import { getApiClient } from '../../lib/apiClient';
import { getAuthService } from '../../lib/auth';
import { useSaveProblem, usePersistedState, useIsMac, useTestExecution } from '../../lib/hooks';
import { Provider } from '@llmhub/core/types';
import {
  MacroCategory,
  Category,
  DsaCategory,
  FrontendCategory,
  SystemDesignCategory,
  Difficulty,
  ProblemPack,
  Attempt,
  RunResult,
} from '../../types/problem';
import { WorkspaceSplitView } from '../../components/WorkspaceSplitView';
import { Timer } from '../../components/Timer';
import { getSandboxConfigForCategory } from '../../utils/sandboxConfig';
import { deriveWorkspaceConfig } from '../../utils/workspaceTemplate';
import type { LLMHubModelsResponse } from '../../types/api';
import { providerLabels, supportedProviders, type ProviderCatalogEntry } from '../../constants/providers';
import {
  macroCategories,
  dsaCategories,
  frontendCategories,
  systemDesignCategories,
  difficulties,
  frontendFrameworks,
  stylingOptions,
  getDefaultCategoryForMacro,
} from '../../constants/formOptions';

type FormOptionsJSON = {
  macroCategories: { value: MacroCategory; label: string; description: string }[];
  dsaCategories: { value: DsaCategory; label: string }[];
  frontendCategories: { value: FrontendCategory; label: string }[];
  systemDesignCategories: { value: SystemDesignCategory; label: string }[];
  difficulties: { value: Difficulty; label: string }[];
  frontendFrameworks: { value: string; label: string }[];
  stylingOptions: { value: string; label: string }[];
};

const normalizeCatalogResponse = (models: LLMHubModelsResponse): ProviderCatalogEntry[] => {
  if (!models?.length) {
    return [];
  }
  const grouped = new Map<Provider, ProviderCatalogEntry['models']>();
  models.forEach((model) => {
    const provider = model.provider;
    if (!grouped.has(provider)) {
      grouped.set(provider, []);
    }
    grouped.get(provider)!.push({ value: model.id, label: model.displayName });
  });
  return supportedProviders.reduce<ProviderCatalogEntry[]>((acc, provider) => {
    const entries = grouped.get(provider);
    if (!entries?.length) {
      return acc;
    }
    acc.push({
      provider,
      displayName: providerLabels[provider],
      models: entries,
    });
    return acc;
  }, []);
};

export function HomePage() {
  const navigate = useNavigate();
  const { publish } = useToast();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [selectedMacroCategory, setSelectedMacroCategory] = useState<MacroCategory>('dsa');
  const [selectedCategory, setSelectedCategory] = useState<Category>('bfs-dfs');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [catalogEntries, setCatalogEntries] = useState<ProviderCatalogEntry[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider>(Provider.OpenAI);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedFramework, setSelectedFramework] =
    useState<(typeof frontendFrameworks)[number]['value']>('React');
  const [selectedStyling, setSelectedStyling] =
    useState<(typeof stylingOptions)[number]['value']>('Tailwind CSS');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProblem, setCurrentProblem] = useState<ProblemPack | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<Attempt | null>(null);
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [solutionCode, setSolutionCode] = useState('');
  const [vimMode, setVimMode] = usePersistedState<boolean>('editor:vimMode', false);
  const isMac = useIsMac();
  const vimShortcutLabel = isMac ? '⌘⇧M' : 'Ctrl+Shift+M';
  const vimShortcutAria = isMac ? 'Meta+Shift+M' : 'Control+Shift+M';

  // Use React Query mutation for saving problems
  const {
    saveProblemAsync,
    isSaving: isSavingProblem,
    savedProblemId,
    reset: resetSaveMutation,
  } = useSaveProblem();

  const workspaceRef = useRef<HTMLDivElement>(null);
  const workspaceHeaderRef = useRef<HTMLDivElement>(null);
  const { runTestsAsync } = useTestExecution();

  // Scroll detection for nav bar hiding/showing
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past 100px - hide nav
        setIsNavHidden(true);
      } else if (currentScrollY < lastScrollY || currentScrollY < 50) {
        // Scrolling up or near the top - show nav
        setIsNavHidden(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Mouse hover detection for nav bar
  useEffect(() => {
    let hoverTimeout: NodeJS.Timeout;
    let isInTopArea = false;

    const handleMouseMove = (e: MouseEvent) => {
      const mouseY = e.clientY;
      const wasInTopArea = isInTopArea;
      isInTopArea = mouseY < 50;

      if (isInTopArea && !wasInTopArea) {
        // Mouse entered top area - show nav immediately
        clearTimeout(hoverTimeout);
        setIsNavHidden(false);
      } else if (!isInTopArea && wasInTopArea) {
        // Mouse left top area - hide nav after delay if scrolled down
        if (window.scrollY > 100) {
          hoverTimeout = setTimeout(() => setIsNavHidden(true), 300);
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hoverTimeout);
    };
  }, []);

  useEffect(() => {
    const handleVimHotkey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const insideEditor = !!target?.closest('.cm-editor');
      const tagName = target?.tagName?.toLowerCase();
      if (!insideEditor && tagName && ['input', 'textarea', 'select'].includes(tagName)) {
        return;
      }
      if (target?.isContentEditable && !insideEditor) {
        return;
      }
      const modifierPressed = isMac ? event.metaKey : event.ctrlKey;
      if (!modifierPressed || !event.shiftKey) {
        return;
      }
      if (event.key.toLowerCase() !== 'm') {
        return;
      }
      event.preventDefault();
      setVimMode((prev) => !prev);
    };

    window.addEventListener('keydown', handleVimHotkey);
    return () => {
      window.removeEventListener('keydown', handleVimHotkey);
    };
  }, [isMac, setVimMode]);

  useEffect(() => {
    let cancelled = false;
    const apiClient = getApiClient();

    const loadCatalog = async () => {
      try {
        const response = await apiClient.getModelCatalog();
        if (cancelled) {
          return;
        }
        setCatalogEntries(normalizeCatalogResponse(response));
      } catch (error) {
        console.error('Failed to load model catalog', error);
      }
    };

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (catalogEntries.length === 0) {
      return;
    }

    const entry = catalogEntries.find((catalogEntry) => catalogEntry.provider === selectedProvider);
    if (!entry) {
      const fallback = catalogEntries[0];
      if (fallback && fallback.provider !== selectedProvider) {
        setSelectedProvider(fallback.provider);
        setSelectedModel(fallback.models[0]?.value ?? '');
      }
      return;
    }

    if (entry.models.length > 0 && !entry.models.some((model) => model.value === selectedModel)) {
      const nextModel = entry.models[0]?.value ?? '';
      if (nextModel && nextModel !== selectedModel) {
        setSelectedModel(nextModel);
      }
    }
  }, [catalogEntries, selectedProvider, selectedModel]);

  const handleMacroCategoryChange = (macro: MacroCategory) => {
    setSelectedMacroCategory(macro);
    setSelectedCategory(getDefaultCategoryForMacro(macro));
  };

  const activeMacroCategory = useMemo<MacroCategory>(
    () => (currentProblem ? currentProblem.macro_category : selectedMacroCategory),
    [currentProblem, selectedMacroCategory],
  );

  const sandboxConfig = useMemo(
    () => getSandboxConfigForCategory(activeMacroCategory),
    [activeMacroCategory],
  );

  const workspaceConfig = useMemo(
    () => (currentProblem ? deriveWorkspaceConfig(currentProblem) : null),
    [currentProblem],
  );

  const editorFileName = workspaceConfig?.fileName ?? 'solution.js';
  const editorLanguage = workspaceConfig?.language ?? 'javascript';
  const defaultEditorCode = workspaceConfig?.initialCode ?? '';
  const providerOptions = catalogEntries.map((entry) => ({
    value: entry.provider,
    label: entry.displayName,
  }));
  const currentProviderEntry = catalogEntries.find((entry) => entry.provider === selectedProvider);
  const modelOptions = currentProviderEntry?.models ?? [];

  useEffect(() => {
    if (!currentProblem) {
      setSolutionCode('');
      resetSaveMutation();
      return;
    }

    setSolutionCode(defaultEditorCode);
    resetSaveMutation();
  }, [currentProblem, defaultEditorCode, resetSaveMutation]);

  const handleProviderSelect = (providerValue: Provider) => {
    if (providerValue === selectedProvider) {
      return;
    }
    setSelectedProvider(providerValue);
    const entry = catalogEntries.find((catalogEntry) => catalogEntry.provider === providerValue);
    if (entry && entry.models.length > 0) {
      setSelectedModel(entry.models[0].value);
    } else {
      setSelectedModel('');
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const apiClient = getApiClient();
      const llmOverrides =
        selectedModel || selectedProvider
          ? {
              provider: selectedProvider,
              model: selectedModel || undefined,
            }
          : undefined;

      // Generate problem
      const generateResponse = await apiClient.generate({
        category: selectedCategory,
        difficulty: selectedDifficulty,
        customPrompt: customPrompt || undefined,
        provider: selectedProvider,
        frontendFramework: selectedMacroCategory === 'frontend' ? selectedFramework : undefined,
        styling: selectedMacroCategory === 'frontend' ? selectedStyling : undefined,
        mode:
          import.meta.env.VITE_API_MODE === 'static' || import.meta.env.VITE_API_MODE === 'llm'
            ? (import.meta.env.VITE_API_MODE as 'static' | 'llm')
            : undefined,
        llm: llmOverrides,
      });

      // Fetch the full problem data
      const problemData = await apiClient.getProblem(generateResponse.problem_id);

      // Create attempt
      const attemptResponse = await apiClient.createAttempt({
        problem_id: generateResponse.problem_id,
        lang: 'javascript',
      });

      // Set current problem and attempt
      setCurrentProblem(problemData);
      setCurrentAttempt(attemptResponse.attempt);

      // Scroll to workspace header after a brief delay
      setTimeout(() => {
        if (workspaceHeaderRef.current) {
          const headerRect = workspaceHeaderRef.current.getBoundingClientRect();
          const absoluteTop = window.pageYOffset + headerRect.top;
          window.scrollTo({
            top: absoluteTop,
            behavior: 'smooth',
          });
        }
      }, 300);
    } catch (error) {
      console.error('Failed to generate problem:', error);
      publish({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNavigateSaved = (initialTab: 'history' | 'saved' = 'saved') => {
    navigate({
      to: '/history',
      search: { tab: initialTab === 'saved' ? 'saved' : undefined },
    });
  };

  const handleNavigateProfile = () => {
    navigate({ to: '/profile' });
  };

  const mapStatusToEditor = (status: string): EditorTestResult['status'] => {
    if (status === 'pass' || status === 'fail') {
      return status;
    }
    return 'error';
  };

  const mapRunResultToEditor = (result: RunResult): EditorTestResult => ({
    id: result.test_id,
    status: mapStatusToEditor(result.status),
    timeMs: Number(result.time_ms),
    stdout: result.stdout,
    stderr: result.stderr,
    message: result.status === 'timeout' || result.status === 'error' ? result.status : undefined,
  });

  const handleRunTests = async (code: string): Promise<EditorTestResult[]> => {
    if (!currentAttempt) {
      const error = new Error('No attempt available for test execution.');
      publish({
        title: 'Run unavailable',
        description: 'Generate a problem and start an attempt before running tests.',
        variant: 'error',
      });
      throw error;
    }

    try {
      const response = await runTestsAsync({
        attempt_id: currentAttempt.id,
        code,
        which: 'public',
      });

      return response.summary.results.map(mapRunResultToEditor);
    } catch (error) {
      console.error('Test execution failed:', error);
      publish({
        title: 'Test execution failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error',
      });
      throw error instanceof Error ? error : new Error('Test execution failed');
    }
  };

  const handleSubmit = async (code: string): Promise<SubmitResult> => {
    if (!currentAttempt) {
      const error = new Error('No attempt available for submission.');
      publish({
        title: 'Submission unavailable',
        description: 'Generate a problem and start an attempt before submitting.',
        variant: 'error',
      });
      throw error;
    }

    try {
      const apiClient = getApiClient();
      const response = await apiClient.submit({
        attempt_id: currentAttempt.id,
        code,
      });

      const results = response.summary.hidden_results.map(mapRunResultToEditor);

      publish({
        title: response.summary.passed ? 'Submission passed!' : 'Submission failed',
        description: response.summary.passed
          ? 'All tests passed! View your results.'
          : 'Some tests failed. Review your solution.',
        variant: response.summary.passed ? 'success' : 'error',
      });

      navigate({
        to: '/results/$attemptId',
        params: { attemptId: currentAttempt.id },
      });

      return {
        passed: response.summary.passed,
        results,
      };
    } catch (error) {
      console.error('Submission failed:', error);
      publish({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error',
      });
      throw error instanceof Error ? error : new Error('Submission failed');
    }
  };

  const handleSaveProblem = async () => {
    if (!currentProblem || !currentAttempt || isSavingProblem || savedProblemId) {
      return;
    }

    try {
      await saveProblemAsync({
        problem_id: currentAttempt.problem_id,
        title: currentProblem.problem.title,
        language: currentAttempt.lang,
        status: 'in_progress',
        tags: [selectedCategory],
        hint_unlocked: false,
      });

      publish({
        title: 'Problem saved',
        description: 'Find it later in your saved problems library.',
        variant: 'success',
      });
    } catch (error) {
      console.error('Failed to save problem:', error);
      publish({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error',
      });
    }
  };

  const handleLogout = () => {
    logout();
    const authService = getAuthService();
    authService.logout();
  };

  const currentCategories =
    selectedMacroCategory === 'dsa'
      ? dsaCategories
      : selectedMacroCategory === 'frontend'
        ? frontendCategories
        : systemDesignCategories;

  const shouldReduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const displayName = user?.name ?? user?.username ?? 'Your account';
  const isSaveDisabled =
    !currentProblem || !currentAttempt || isSavingProblem || Boolean(savedProblemId);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-default)' }}>
      {/* Sticky Header */}
      <motion.header
        className="sticky top-0 z-40 border-b"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-default)',
          backdropFilter: 'blur(8px)',
        }}
        animate={{
          y: isNavHidden ? -80 : 0, // Hide/show with smooth animation
        }}
        transition={{
          duration: 0.3,
          ease: isNavHidden ? 'easeOut' : 'easeIn', // Ease out when hiding, ease in when showing
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles
                className="h-5 w-5"
                style={{ color: 'var(--accent-primary)' }}
                aria-hidden="true"
              />
              <h2>Improview</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleNavigateSaved('saved')}
                >
                  <BookMarked className="h-4 w-4" />
                  <span className="hidden sm:inline">Saved Problems</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <UserIcon className="h-5 w-5" />
                      <span className="sr-only">User menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{displayName}</span>
                        {user.email ? (
                          <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                            {user.email}
                          </span>
                        ) : null}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleNavigateSaved('history')}
                      className="gap-2"
                    >
                      <BookMarked className="h-4 w-4" />
                      Attempt history
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleNavigateProfile} className="gap-2">
                      <UserIcon className="h-4 w-4" />
                      Profile &amp; settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="gap-2 text-danger-600"
                      variant="destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button variant="primary" size="sm" onClick={() => navigate({ to: '/auth/login' })}>
                Sign in
              </Button>
            )}
            <ThemeToggle className="ml-1" />
          </div>
        </div>
      </motion.header>

      {/* Generation Form */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
          className="space-y-8"
        >
          <div className="text-center space-y-2">
            <h1>Practice Interview Problems</h1>
            <p style={{ color: 'var(--fg-muted)' }}>
              Generate AI-powered problems tailored to your practice needs
            </p>
          </div>

          {/* Macro Category Selection */}
          <div className="space-y-3">
            <label htmlFor="macro-category-group">Problem Type</label>
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              role="group"
              id="macro-category-group"
              aria-label="Select problem type"
            >
              {macroCategories.map(({ value, label, description }) => (
                <button
                  key={value}
                  onClick={() => handleMacroCategoryChange(value)}
                  className="border p-4 rounded-lg text-left transition-all"
                  style={{
                    backgroundColor:
                      selectedMacroCategory === value ? 'var(--accent-soft)' : 'var(--bg-panel)',
                    borderColor:
                      selectedMacroCategory === value
                        ? 'var(--accent-primary)'
                        : 'var(--border-default)',
                    borderWidth: selectedMacroCategory === value ? '2px' : '1px',
                  }}
                  aria-pressed={selectedMacroCategory === value}
                >
                  <div className="space-y-1">
                    <div className="font-medium" style={{ color: 'var(--fg-default)' }}>
                      {label}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                      {description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Category Selection */}
          <div className="space-y-3">
            <label htmlFor="category-group">
              {selectedMacroCategory === 'dsa'
                ? 'Topic'
                : selectedMacroCategory === 'frontend'
                  ? 'Focus Area'
                  : 'Design Aspect'}
            </label>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              id="category-group"
              aria-label="Select specific category"
            >
              {currentCategories.map(({ value, label }) => (
                <Badge
                  key={value}
                  variant={selectedCategory === value ? 'accent' : 'outline'}
                  className="cursor-pointer px-4 py-2 transition-all hover:scale-105"
                  onClick={() => setSelectedCategory(value as Category)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedCategory(value as Category);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selectedCategory === value}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Difficulty Selection */}
          <div className="space-y-3">
            <label htmlFor="difficulty-group">Difficulty</label>
            <div
              className="grid grid-cols-3 gap-3"
              role="group"
              id="difficulty-group"
              aria-label="Select difficulty level"
            >
              {difficulties.map(({ value, label }) => (
                <Button
                  key={value}
                  variant="selectable"
                  onClick={() => setSelectedDifficulty(value)}
                  aria-pressed={selectedDifficulty === value}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {selectedMacroCategory === 'frontend' ? (
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <label htmlFor="framework-group">Framework</label>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  id="framework-group"
                  aria-label="Select frontend framework"
                >
                  {frontendFrameworks.map(({ value, label }) => (
                    <Button
                      key={value}
                      variant="selectable"
                      onClick={() => setSelectedFramework(value)}
                      aria-pressed={selectedFramework === value}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label htmlFor="styling-group">Styling</label>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  id="styling-group"
                  aria-label="Select styling preference"
                >
                  {stylingOptions.map(({ value, label }) => (
                    <Button
                      key={value}
                      variant="selectable"
                      onClick={() => setSelectedStyling(value)}
                      aria-pressed={selectedStyling === value}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Provider Selection */}
          <div className="space-y-3">
            <label htmlFor="provider-group">AI Provider</label>
            <div
              className="grid grid-cols-2 gap-3"
              role="group"
              id="provider-group"
              aria-label="Select AI provider"
            >
              {providerOptions.map(({ value, label }) => (
                <Button
                  key={value}
                  variant="selectable"
                  onClick={() => handleProviderSelect(value)}
                  aria-pressed={selectedProvider === value}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Select
              label="Model"
              placeholder={modelOptions.length === 0 ? 'No models available' : undefined}
              disabled={modelOptions.length === 0}
              value={selectedModel}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                setSelectedModel(event.target.value)
              }
              options={modelOptions}
            />
          </div>

          {/* Custom Prompt */}
          <div className="space-y-3">
            <label htmlFor="custom-prompt">
              Custom Instructions <span style={{ color: 'var(--fg-subtle)' }}>(Optional)</span>
            </label>
            <p className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
              Optional. Nudges the LLM if you want specific problem characteristics.
            </p>
            <Textarea
              id="custom-prompt"
              placeholder="e.g., Prefer grid graphs, include negative numbers, etc."
              value={customPrompt}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                setCustomPrompt(event.target.value)
              }
              className="resize-none h-24"
              aria-describedby="prompt-helper"
            />
          </div>

          {/* Generate Button */}
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={handleGenerate}
            disabled={isGenerating}
            aria-label={isGenerating ? 'Generating problem...' : 'Generate problem'}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Generating Problem...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" aria-hidden="true" />
                Generate Problem
              </>
            )}
          </Button>
        </motion.div>
      </section>

      {/* Workspace Section */}
      <AnimatePresence>
        {currentProblem && (
          <motion.section
            ref={workspaceRef}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.4 }}
            className="border-t min-h-screen"
            style={{
              backgroundColor: 'var(--bg-sunken)',
              borderColor: 'var(--border-default)',
            }}
          >
            <div className="max-w-[1800px] mx-auto">
              {/* Workspace Header */}
              <div
                ref={workspaceHeaderRef}
                className="border-b px-6 py-4 flex items-center justify-between"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border-default)',
                }}
              >
                <div className="flex items-center gap-3">
                  <h2>{currentProblem.problem.title}</h2>
                  <Badge variant="outline">{selectedCategory}</Badge>
                  <Badge variant="outline">{selectedDifficulty}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Timer estimatedMinutes={currentProblem.time_estimate_minutes} autoStart />
                  <motion.div
                    animate={
                      savedProblemId
                        ? {
                            scale: [1, 1.15, 1],
                            rotate: [0, -5, 5, 0],
                          }
                        : {}
                    }
                    transition={{
                      duration: 0.5,
                      ease: 'easeInOut',
                    }}
                    whileTap={
                      !isSaveDisabled
                        ? {
                            scale: 0.95,
                            rotate: -3,
                          }
                        : {}
                    }
                  >
                    <Button
                      variant={savedProblemId ? 'primary' : 'outline'}
                      size="sm"
                      className="gap-2 relative overflow-hidden"
                      onClick={handleSaveProblem}
                      disabled={isSaveDisabled}
                    >
                      <AnimatePresence mode="wait">
                        {isSavingProblem ? (
                          <motion.div
                            key="saving"
                            initial={{ opacity: 0, rotate: -90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: 90 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="bookmark"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.2 }}
                          >
                            <BookMarked className="h-4 w-4" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {savedProblemId ? 'Saved' : isSavingProblem ? 'Saving...' : 'Save'}
                      {savedProblemId && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          initial={{ x: '-100%' }}
                          animate={{ x: '100%' }}
                          transition={{
                            duration: 0.6,
                            ease: 'easeInOut',
                          }}
                        />
                      )}
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Problem + Editor Split */}
              <div className="h-[calc(100vh-120px)] min-h-0">
                <WorkspaceSplitView
                  className="h-full"
                  problem={currentProblem}
                  minLeft={360}
                  minRight={360}
                  initialFraction={0.5}
                  editorProps={{
                    value: solutionCode,
                    defaultValue: defaultEditorCode,
                    onChange: setSolutionCode,
                    fileName: editorFileName,
                    language: editorLanguage,
                    onRunTests: handleRunTests,
                    onSubmit: handleSubmit,
                    runLabel: 'Run Tests',
                    submitLabel: 'Submit',
                    className: 'flex-1 rounded-none border-0 shadow-none',
                    showPreview: sandboxConfig.showPreview,
                    showFileExplorer: sandboxConfig.showFileExplorer,
                    showSandpackConsole: sandboxConfig.showSandpackConsole,
                    sandpackOptions: sandboxConfig.sandpackOptions,
                    sandpackTemplate: workspaceConfig?.sandpackTemplate,
                    sandpackFiles: workspaceConfig?.sandpackFiles,
                    sandpackSetup: workspaceConfig?.sandpackSetup,
                    actions: (
                      <Button
                        variant={vimMode ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setVimMode((prev) => !prev)}
                        aria-pressed={vimMode}
                        title={`Toggle Vim mode (${vimShortcutLabel})`}
                        aria-keyshortcuts={vimShortcutAria}
                      >
                        {vimMode ? 'Vim: On' : 'Vim: Off'}
                      </Button>
                    ),
                    vimMode,
                  }}
                />
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
