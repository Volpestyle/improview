import { useState } from 'react';
import { PracticeScreen } from './components/practice-screen';
import { LoginScreen } from './components/login-screen';
import { SavedProblems } from './components/saved-problems';
import { SkipLink } from './components/skip-link';
import { MacroCategory, Category, Difficulty, Provider, ProblemPack } from './types/problem';
import { User } from './types/user';
import { generateMockProblem } from './lib/mock-data';
import { mockUser, mockAttempts, mockLists } from './lib/mock-user-data';
import { mockSavedProblems } from './lib/mock-saved-data';
import { ThemeProvider } from './lib/theme-provider';

type Screen = 'login' | 'practice' | 'saved';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (loginData: { email: string }) => {
    // In production, this would validate and fetch user data
    setUser(mockUser);
    setScreen('practice');
  };

  const handleLogout = () => {
    setUser(null);
    setScreen('login');
  };

  const handleGenerate = async (
    macroCategory: MacroCategory,
    category: Category,
    difficulty: Difficulty,
    provider: Provider,
    customPrompt?: string
  ): Promise<ProblemPack> => {
    // In production, this would call the API
    await new Promise(resolve => setTimeout(resolve, 1500));
    return generateMockProblem(category, difficulty);
  };

  const handleNavigatePractice = () => {
    setScreen('practice');
  };

  const handleNavigateSaved = () => {
    setScreen('saved');
  };

  const handleViewAttempt = (attemptId: string) => {
    console.log('View attempt:', attemptId);
    // In production, this would load the attempt details
  };

  const handleCreateList = () => {
    console.log('Create new list');
    // In production, this would open a dialog to create a new list
  };

  const handleSaveProblem = (problem: ProblemPack) => {
    console.log('Save problem:', problem.id);
    // In production, this would save the problem
  };

  const handleUnsaveProblem = (problemId: string) => {
    console.log('Unsave problem:', problemId);
    // In production, this would remove the problem from saved
  };

  return (
    <ThemeProvider>
      <SkipLink />
      <div className="size-full" id="main-content">
        {screen === 'login' && <LoginScreen onLogin={handleLogin} />}
        
        {screen === 'practice' && (
          <PracticeScreen 
            onGenerate={handleGenerate}
            onNavigateSaved={handleNavigateSaved}
            user={user}
            onLogout={handleLogout}
            onSaveProblem={handleSaveProblem}
          />
        )}
        
        {screen === 'saved' && (
          <SavedProblems
            attempts={mockAttempts}
            savedProblems={mockSavedProblems}
            lists={mockLists}
            onNavigateHome={handleNavigatePractice}
            onViewAttempt={handleViewAttempt}
            onCreateList={handleCreateList}
            onUnsaveProblem={handleUnsaveProblem}
          />
        )}
      </div>
    </ThemeProvider>
  );
}