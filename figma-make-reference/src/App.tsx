import { useState } from 'react';
import { PracticeScreen } from './components/practice-screen';
import { LoginScreen } from './components/login-screen';
import { SavedProblems } from './components/saved-problems';
import { ProfileScreen } from './components/profile-screen';
import { SkipLink } from './components/skip-link';
import { MacroCategory, Category, Difficulty, Provider, ProblemPack } from './types/problem';
import { User } from './types/user';
import { UserPreferences } from './types/stats';
import { generateMockProblem } from './lib/mock-data';
import { mockUser, mockAttempts, mockLists } from './lib/mock-user-data';
import { mockSavedProblems } from './lib/mock-saved-data';
import { mockUserStats, mockUserPreferences } from './lib/mock-stats';
import { ThemeProvider } from './lib/theme-provider';

type Screen = 'login' | 'practice' | 'saved' | 'profile';

export default function App() {
  const [screen, setScreen] = useState<Screen>('practice');
  const [user, setUser] = useState<User | null>(mockUser);
  const [preferences, setPreferences] = useState<UserPreferences>(mockUserPreferences);

  const handleLogin = (loginData: { email: string }) => {
    // In production, this would validate and fetch user data
    setUser(mockUser);
    setScreen('practice');
  };

  const handleLogout = () => {
    setUser(null);
    setScreen('login');
  };

  const handleUpdatePreferences = (updatedPreferences: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updatedPreferences }));
    console.log('Updated preferences:', updatedPreferences);
    // In production, this would sync with the backend
  };

  const handleDeleteAccount = () => {
    console.log('Delete account requested');
    // In production, this would show a confirmation dialog and handle deletion
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

  const handleNavigateProfile = () => {
    console.log('Navigating to profile...');
    setScreen('profile');
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
            onNavigateProfile={handleNavigateProfile}
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
        
        {screen === 'profile' && user && (
          <ProfileScreen
            user={user}
            stats={mockUserStats}
            preferences={preferences}
            onNavigateHome={handleNavigatePractice}
            onUpdatePreferences={handleUpdatePreferences}
            onDeleteAccount={handleDeleteAccount}
          />
        )}
      </div>
    </ThemeProvider>
  );
}