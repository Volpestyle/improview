import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Sparkles, Loader2, BookMarked, LogOut, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { MacroCategory, Category, DsaCategory, FrontendCategory, SystemDesignCategory, Difficulty, Provider } from '../types/problem';
import { User } from '../types/user';
import { ThemeToggle } from './theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface HomeScreenProps {
  onGenerate: (macroCategory: MacroCategory, category: Category, difficulty: Difficulty, provider: Provider, customPrompt?: string) => void;
  onNavigateSaved: () => void;
  onNavigateProfile: () => void;
  user: User | null;
  onLogout: () => void;
}

const macroCategories: { value: MacroCategory; label: string; description: string }[] = [
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

export function HomeScreen({ onGenerate, onNavigateSaved, onNavigateProfile, user, onLogout }: HomeScreenProps) {
  const [selectedMacroCategory, setSelectedMacroCategory] = useState<MacroCategory>('dsa');
  const [selectedCategory, setSelectedCategory] = useState<Category>('bfs-dfs');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [selectedProvider, setSelectedProvider] = useState<Provider>('openai');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Update category when macro category changes
  const handleMacroCategoryChange = (macro: MacroCategory) => {
    setSelectedMacroCategory(macro);
    // Set default category based on macro category
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
    // Simulate generation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    onGenerate(selectedMacroCategory, selectedCategory, selectedDifficulty, selectedProvider, customPrompt);
    setIsGenerating(false);
  };

  const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Get current categories based on macro category
  const currentCategories = selectedMacroCategory === 'dsa' 
    ? dsaCategories 
    : selectedMacroCategory === 'frontend'
    ? frontendCategories
    : systemDesignCategories;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* Header Actions - Top Right */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {user && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateSaved}
              className="gap-2"
            >
              <BookMarked className="h-4 w-4" />
              Saved Problems
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <UserIcon className="h-5 w-5" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onNavigateProfile} className="gap-2">
                  <UserIcon className="h-4 w-4" />
                  Profile & Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        <ThemeToggle />
      </div>

      <motion.div
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
        className="w-full max-w-4xl space-y-8"
        role="main"
        aria-label="Problem generator"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: shouldReduceMotion ? 0 : 0.1, duration: shouldReduceMotion ? 0 : 0.18 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              backgroundColor: 'var(--accent-soft)',
              borderColor: 'var(--accent-primary)',
              borderWidth: '1px',
            }}
          >
            <Sparkles className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} aria-hidden="true" />
            <span style={{ color: 'var(--accent-primary)' }}>AI-Powered Practice</span>
          </motion.div>
          <h1>Improview</h1>
          <p style={{ color: 'var(--fg-muted)' }} className="max-w-2xl mx-auto">
            Lightning-fast coding interview practice. Pick a category and difficulty, 
            then get AI-generated problems with tests, hints, and solutions.
          </p>
          <p className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
            Problems generated by AI providers; review outputs before sharing.
          </p>
        </div>

        {/* Macro Category Selection */}
        <div className="space-y-3">
          <label htmlFor="macro-category-group">Problem Type</label>
          <div 
            className="grid grid-cols-3 gap-3" 
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
                  backgroundColor: selectedMacroCategory === value ? 'var(--accent-soft)' : 'var(--bg-panel)',
                  borderColor: selectedMacroCategory === value ? 'var(--accent-primary)' : 'var(--border-default)',
                  borderWidth: selectedMacroCategory === value ? '2px' : '1px',
                }}
                aria-pressed={selectedMacroCategory === value}
              >
                <div className="space-y-1">
                  <div 
                    className="font-medium"
                    style={{ 
                      color: selectedMacroCategory === value ? 'var(--accent-primary)' : 'var(--fg-default)' 
                    }}
                  >
                    {label}
                  </div>
                  <div 
                    className="text-sm"
                    style={{ color: 'var(--fg-muted)' }}
                  >
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
            {selectedMacroCategory === 'dsa' ? 'Topic' : 
             selectedMacroCategory === 'frontend' ? 'Focus Area' : 'Design Aspect'}
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
                variant={selectedCategory === value ? 'default' : 'outline'}
                className="cursor-pointer px-4 py-2 transition-all hover:scale-105"
                onClick={() => setSelectedCategory(value as Category)}
                onKeyDown={(e) => {
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
            className="flex gap-3" 
            role="group" 
            id="difficulty-group"
            aria-label="Select difficulty level"
          >
            {difficulties.map(({ value, label }) => (
              <Button
                key={value}
                variant={selectedDifficulty === value ? 'default' : 'outline'}
                className="flex-1"
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
            className="flex gap-3" 
            role="group" 
            id="provider-group"
            aria-label="Select AI provider"
          >
            {providers.map(({ value, label }) => (
              <Button
                key={value}
                variant={selectedProvider === value ? 'default' : 'outline'}
                className="flex-1"
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

        {/* Footer */}
        <p className="text-center" style={{ color: 'var(--fg-muted)' }}>
          Powered by {selectedProvider === 'openai' ? 'OpenAI' : 'Grok 4 Fast'} • 
          Light & dark themes • Keyboard-friendly
        </p>
      </motion.div>
    </div>
  );
}
