import { useState } from 'react';
import { ProblemPack, TestResult } from '../types/problem';
import { ProblemPanel } from './problem-panel';
import { EditorPanel } from './editor-panel';
import { Timer } from './timer';
import { Button } from './ui/button';
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
import { ThemeToggle } from './theme-toggle';

interface WorkspaceProps {
  problem: ProblemPack;
  onBack: () => void;
}

export function Workspace({ problem, onBack }: WorkspaceProps) {
  const [isProblemPanelVisible, setIsProblemPanelVisible] = useState(true);

  const initialCode = `function ${problem.api.function_name}(${problem.api.params.map(p => p.name).join(', ')}) {
  // Your implementation here
  
}`;

  // Mock test execution
  const handleRunTests = async (code: string): Promise<TestResult[]> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return problem.tests.public.map((test, idx) => ({
      test_id: `test_${idx}`,
      status: code.includes('return') ? 'pass' : 'fail',
      time_ms: Math.floor(Math.random() * 50) + 5,
      expected: test.output,
      actual: code.includes('return') ? test.output : null,
    }));
  };

  const handleSubmit = async (code: string): Promise<{ passed: boolean; results: TestResult[] }> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const allTests = [...problem.tests.public, ...problem.tests.hidden];
    const results = allTests.map((test, idx) => ({
      test_id: `test_${idx}`,
      status: (code.includes('return') && Math.random() > 0.3 ? 'pass' : 'fail') as 'pass' | 'fail',
      time_ms: Math.floor(Math.random() * 50) + 5,
      expected: test.output,
      actual: code.includes('return') ? test.output : null,
    }));

    return {
      passed: results.every(r => r.status === 'pass'),
      results,
    };
  };

  const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div 
      className="h-screen flex flex-col"
      style={{ backgroundColor: 'var(--bg-default)' }}
    >
      {/* Header */}
      <motion.header
        initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-default)',
        }}
        role="banner"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Button>
          <div className="h-4 w-px" style={{ backgroundColor: 'var(--border-default)' }} />
          <div style={{ color: 'var(--fg-muted)' }}>
            {problem.problem.title}
          </div>
          <div className="h-4 w-px" style={{ backgroundColor: 'var(--border-default)' }} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsProblemPanelVisible(!isProblemPanelVisible)}
            className="gap-2"
            aria-label={isProblemPanelVisible ? 'Hide problem panel' : 'Show problem panel'}
            aria-expanded={isProblemPanelVisible}
          >
            {isProblemPanelVisible ? (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            )}
            {isProblemPanelVisible ? 'Hide' : 'Show'} Problem
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Timer estimatedMinutes={problem.time_estimate_minutes} autoStart />
          <ThemeToggle />
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden" role="main">
        <ResizablePanelGroup direction="horizontal">
          <AnimatePresence initial={false}>
            {isProblemPanelVisible && (
              <>
                <ResizablePanel defaultSize={40} minSize={30} maxSize={60}>
                  <ProblemPanel problem={problem} />
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}
          </AnimatePresence>

          <ResizablePanel defaultSize={60} minSize={40}>
            <EditorPanel
              initialCode={initialCode}
              onRunTests={handleRunTests}
              onSubmit={handleSubmit}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
