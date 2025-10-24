import { useState } from 'react';
import { Button, ScrollArea } from '@improview/ui';
import { Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProblemPack } from '../types/problem';

interface ProblemPanelProps {
  problem: ProblemPack;
}

export function ProblemPanel({ problem }: ProblemPanelProps) {
  const [hintVisible, setHintVisible] = useState(false);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Problem Statement */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{problem.problem.title}</h2>
            <div
              className="prose prose-sm max-w-none"
              style={{ color: 'var(--fg-default)' }}
              dangerouslySetInnerHTML={{
                __html: problem.problem.statement.replace(/\n/g, '<br />'),
              }}
            />
          </div>

          {/* Examples */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Examples</h3>
            {problem.problem.examples.map((example, idx) => (
              <div
                key={idx}
                className="rounded-lg p-4 space-y-3"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border-default)',
                }}
              >
                <div>
                  <div style={{ color: 'var(--fg-muted)' }} className="mb-1">
                    Input:
                  </div>
                  <code
                    className="block px-3 py-2 rounded font-mono text-sm"
                    style={{ backgroundColor: 'var(--bg-sunken)' }}
                  >
                    {JSON.stringify(example.input, null, 2)}
                  </code>
                </div>
                <div>
                  <div style={{ color: 'var(--fg-muted)' }} className="mb-1">
                    Output:
                  </div>
                  <code
                    className="block px-3 py-2 rounded font-mono text-sm"
                    style={{ backgroundColor: 'var(--bg-sunken)' }}
                  >
                    {JSON.stringify(example.output)}
                  </code>
                </div>
                {example.explanation && (
                  <div style={{ color: 'var(--fg-muted)' }} className="italic">
                    {example.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Constraints */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Constraints</h3>
            <ul className="space-y-1" style={{ color: 'var(--fg-muted)' }}>
              {problem.problem.constraints.map((constraint, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span style={{ color: 'var(--accent-primary)' }} className="mt-1">
                    •
                  </span>
                  <code className="font-mono text-sm">{constraint}</code>
                </li>
              ))}
            </ul>
          </div>

          {/* Hint */}
          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={() => setHintVisible(!hintVisible)}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                {hintVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {hintVisible ? 'Hide Hint' : 'Show Hint'}
              </span>
            </Button>
            <AnimatePresence initial={false}>
              {hintVisible ? (
                <motion.div
                  key="hint"
                  layout
                  initial={{ opacity: 0, scaleY: 0.9 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0.9 }}
                  transition={{
                    opacity: { duration: 0.16, ease: 'easeOut' },
                    scaleY: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
                    layout: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
                  }}
                  className="rounded-lg border p-4"
                  style={{
                    originY: 0,
                    backgroundColor: 'var(--accent-soft)',
                    borderColor: 'var(--accent-primary)',
                    borderWidth: '1px',
                    overflow: 'hidden',
                  }}
                >
                  <motion.span
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="block"
                  >
                    💡 {problem.hint}
                  </motion.span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
