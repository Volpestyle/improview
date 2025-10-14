import { useState, useEffect } from 'react';
import { initializeTheme, applyTheme, type Theme } from '@improview/ui';
import {
  ThemeToggle,
  Header,
  Philosophy,
  ButtonShowcase,
  CardShowcase,
  ComponentGallery,
  ColorPalette,
  QuickActions,
  Footer,
} from './components';
import './App.css';

export function App() {
  const [currentTheme, setCurrentTheme] = useState<Theme>('light');

  useEffect(() => {
    const theme = initializeTheme();
    setCurrentTheme(theme);
  }, []);

  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    setCurrentTheme(newTheme);
  };

  return (
    <div className="demo-app">
      <ThemeToggle currentTheme={currentTheme} onToggle={toggleTheme} />

      <div className="demo-container">
        <Header />
        <Philosophy />
        <ButtonShowcase />
        <CardShowcase />
        <ComponentGallery />
        <ColorPalette />
        <QuickActions />
        <Footer />
      </div>
    </div>
  );
}
