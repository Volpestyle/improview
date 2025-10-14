import { useState, useRef, useEffect } from 'react';
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
  Textarea,
  ThemeToggle,
  useToast,
} from '@improview/ui';
import { Sparkles, Loader2, BookMarked, LogOut, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../state/authStore';
import { getApiClient } from '../../lib/apiClient';
import { getAuthService } from '../../lib/auth';
import {
  MacroCategory,
  Category,
  DsaCategory,
  FrontendCategory,
  SystemDesignCategory,
  Difficulty,
  Provider,
  ProblemPack,
  Attempt,
  TestResult,
} from '../../types/problem';
import { ProblemPanel } from '../../components/ProblemPanel';
import { EditorPanel } from '../../components/EditorPanel';
import { Timer } from '../../components/Timer';

const macroCategories: {
  value: MacroCategory;
  label: string;
  description: string;
}[] = [
  { value: 'dsa', label: 'DSA', description: 'Data Structures & Algorithms' },
  { value: 'frontend', label: 'Frontend', description: 'UI/UX & Web Development' },
  { value: 'system-design', label: 'System Design', description: 'Architecture & Scalability' },
];

const dsaCategories: { value: DsaCategory; label: string }[] = [
  { value: 'arrays', label: 'Arrays' },
  { value: 'bfs-dfs', label: 'BFS/DFS' },
  { value: 'maps-sets', label: 'Maps/Sets' },
  { value: 'dp', label: 'Dynamic Programming' },
  { value: 'graphs', label: 'Graphs' },
  { value: 'strings', label: 'Strings' },
  { value: 'math', label: 'Math' },
  { value: 'heaps', label: 'Heaps' },
  { value: 'two-pointers', label: 'Two Pointers' },
];

const frontendCategories: { value: FrontendCategory; label: string }[] = [
  { value: 'react-components', label: 'React Components' },
  { value: 'css-layouts', label: 'CSS Layouts' },
  { value: 'accessibility', label: 'Accessibility' },
  { value: 'state-management', label: 'State Management' },
  { value: 'performance', label: 'Performance' },
  { value: 'forms-validation', label: 'Forms & Validation' },
];

const systemDesignCategories: { value: SystemDesignCategory; label: string }[] = [
  { value: 'scalability', label: 'Scalability' },
  { value: 'databases', label: 'Databases' },
  { value: 'caching', label: 'Caching' },
  { value: 'load-balancing', label: 'Load Balancing' },
  { value: 'microservices', label: 'Microservices' },
  { value: 'api-design', label: 'API Design' },
];

const difficulties: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const providers: { value: Provider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'grok', label: 'Grok 4 Fast' },
];

export function HomePage() {
  const navigate = useNavigate();
  const { publish } = useToast();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [selectedMacroCategory, setSelectedMacroCategory] = useState<MacroCategory>('dsa');
  const [selectedCategory, setSelectedCategory] = useState<Category>('bfs-dfs');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [selectedProvider, setSelectedProvider] = useState<Provider>('openai');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProblem, setCurrentProblem] = useState<ProblemPack | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<Attempt | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const workspaceHeaderRef = useRef<HTMLDivElement>(null);

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

  const handleMacroCategoryChange = (macro: MacroCategory) => {
    setSelectedMacroCategory(macro);
    if (macro === 'dsa') {
      setSelectedCategory('bfs-dfs' as Category);
    } else if (macro === 'frontend') {
      setSelectedCategory('react-components' as Category);
    } else {
      setSelectedCategory('scalability' as Category);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const apiClient = getApiClient();

      // Generate problem
      const generateResponse = await apiClient.generate({
        category: selectedCategory,
        difficulty: selectedDifficulty,
        customPrompt: customPrompt || undefined,
        provider: selectedProvider,
        mode:
          import.meta.env.VITE_API_MODE === 'static' || import.meta.env.VITE_API_MODE === 'llm'
            ? (import.meta.env.VITE_API_MODE as 'static' | 'llm')
            : undefined,
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

  // Mock test execution (same as in figma-make-reference)
  const handleRunTests = async (code: string): Promise<TestResult[]> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (!currentProblem) return [];

    return currentProblem.tests.public.map((test, idx) => ({
      test_id: `test_${idx}`,
      status: code.includes('return') ? 'pass' : 'fail',
      time_ms: Math.floor(Math.random() * 50) + 5,
      expected: test.output,
      actual: code.includes('return') ? test.output : null,
    }));
  };

  const handleSubmit = async (
    code: string,
  ): Promise<{ passed: boolean; results: TestResult[] }> => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (!currentProblem) return { passed: false, results: [] };

    const allTests = [...currentProblem.tests.public, ...currentProblem.tests.hidden];
    const results = allTests.map((test, idx) => ({
      test_id: `test_${idx}`,
      status: (code.includes('return') && Math.random() > 0.3 ? 'pass' : 'fail') as 'pass' | 'fail',
      time_ms: Math.floor(Math.random() * 50) + 5,
      expected: test.output,
      actual: code.includes('return') ? test.output : null,
    }));

    return {
      passed: results.every((r) => r.status === 'pass'),
      results,
    };
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

          {/* Provider Selection */}
          <div className="space-y-3">
            <label htmlFor="provider-group">AI Provider</label>
            <div
              className="grid grid-cols-2 gap-3"
              role="group"
              id="provider-group"
              aria-label="Select AI provider"
            >
              {providers.map(({ value, label }) => (
                <Button
                  key={value}
                  variant="selectable"
                  onClick={() => setSelectedProvider(value)}
                  aria-pressed={selectedProvider === value}
                >
                  {label}
                </Button>
              ))}
            </div>
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
              onChange={(e) => setCustomPrompt(e.target.value)}
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
                  <Button variant="outline" size="sm" className="gap-2">
                    <BookMarked className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              </div>

              {/* Problem + Editor Split */}
              <div className="grid lg:grid-cols-2 h-[calc(100vh-120px)]">
                <div className="border-r" style={{ borderColor: 'var(--border-default)' }}>
                  <ProblemPanel problem={currentProblem} />
                </div>
                <div>
                  <EditorPanel
                    initialCode={`function ${currentProblem.api.function_name}(${currentProblem.api.params.map((p) => p.name).join(', ')}) {
  // Your implementation here

}`}
                    onRunTests={handleRunTests}
                    onSubmit={handleSubmit}
                  />
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
