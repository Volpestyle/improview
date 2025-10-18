import { useState, useEffect } from 'react';
import { Button, ScrollArea, Tabs, TabsContent, TabsList, TabsTrigger } from '@improview/ui';
import { Play, Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TestResult } from '../types/problem';

interface EditorPanelProps {
  initialCode: string;
  onRunTests: (code: string) => Promise<TestResult[]>;
  onSubmit: (code: string) => Promise<{ passed: boolean; results: TestResult[] }>;
}

export function EditorPanel({ initialCode, onRunTests, onSubmit }: EditorPanelProps) {
  const [code, setCode] = useState(initialCode);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lineNumbers, setLineNumbers] = useState(1);

  // Update line numbers when code changes
  useEffect(() => {
    const lines = code.split('\n').length;
    setLineNumbers(Math.max(lines, 1));
  }, [code]);

  // Update code when initialCode changes
  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const results = await onRunTests(code);
      setTestResults(results);
    } catch (error) {
      console.error('Failed to run tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await onSubmit(code);
      setTestResults(result.results);
      // TODO: Navigate to results page on success
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ backgroundColor: 'var(--bg-sunken)' }}>
      {/* Editor Header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--fg-muted)' }}>solution.js</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRunTests}
            disabled={isRunning || isSubmitting}
            className="gap-2"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run Tests
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isRunning || isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit
          </Button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex flex-1">
          {/* Line Numbers */}
          <div
            className="px-3 py-4 font-mono select-none border-r"
            style={{
              backgroundColor: 'var(--bg-sunken)',
              color: 'var(--fg-subtle)',
              borderColor: 'var(--border-default)',
            }}
          >
            {Array.from({ length: lineNumbers }, (_, i) => (
              <div key={i} className="leading-6">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code Area */}
          <ScrollArea className="flex-1">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full min-h-full px-4 py-4 leading-6 resize-none focus:outline-none font-mono"
              style={{
                backgroundColor: 'var(--bg-sunken)',
                color: 'var(--fg-default)',
                tabSize: 2,
              }}
              spellCheck={false}
            />
          </ScrollArea>
        </div>
      </div>

      {/* Test Results */}
      <AnimatePresence>
        {testResults && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t overflow-hidden"
            style={{
              borderColor: 'var(--border-default)',
              backgroundColor: 'var(--bg-panel)',
            }}
          >
            <Tabs defaultValue="results" className="w-full">
              <TabsList
                className="w-full justify-start rounded-none border-b px-4"
                style={{ borderColor: 'var(--border-default)' }}
              >
                <TabsTrigger value="results">Test Results</TabsTrigger>
                <TabsTrigger value="console">Console</TabsTrigger>
              </TabsList>
              <TabsContent value="results" className="m-0">
                <ScrollArea className="h-64">
                  <div className="p-4 space-y-2">
                    {testResults.map((result, idx) => (
                      <motion.div
                        key={result.test_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-3 rounded-lg border"
                        style={{
                          backgroundColor:
                            result.status === 'pass' ? 'var(--success-soft)' : 'var(--danger-soft)',
                          borderColor:
                            result.status === 'pass' ? 'var(--success-600)' : 'var(--danger-600)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-2 flex-1">
                            {result.status === 'pass' ? (
                              <CheckCircle2
                                className="h-4 w-4 mt-0.5 flex-shrink-0"
                                style={{ color: 'var(--success-600)' }}
                              />
                            ) : (
                              <XCircle
                                className="h-4 w-4 mt-0.5 flex-shrink-0"
                                style={{ color: 'var(--danger-600)' }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono">Test {idx + 1}</span>
                                <span style={{ color: 'var(--fg-muted)' }}>•</span>
                                <span style={{ color: 'var(--fg-muted)' }} className="font-mono">
                                  {result.time_ms}ms
                                </span>
                              </div>
                              {result.status === 'fail' && result.expected !== undefined && (
                                <div className="space-y-1 mt-2">
                                  <div className="font-mono">
                                    <span style={{ color: 'var(--fg-muted)' }}>Expected: </span>
                                    <span style={{ color: 'var(--success-600)' }}>
                                      {JSON.stringify(result.expected)}
                                    </span>
                                  </div>
                                  <div className="font-mono">
                                    <span style={{ color: 'var(--fg-muted)' }}>Got: </span>
                                    <span style={{ color: 'var(--danger-600)' }}>
                                      {JSON.stringify(result.actual)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="console" className="m-0">
                <ScrollArea className="h-64">
                  <div className="p-4 font-mono" style={{ color: 'var(--fg-muted)' }}>
                    {testResults.some((r) => r.stdout || r.stderr) ? (
                      <div className="space-y-2">
                        {testResults.map((result, idx) => (
                          <div key={idx}>
                            {result.stdout && <div>{result.stdout}</div>}
                            {result.stderr && (
                              <div style={{ color: 'var(--danger-600)' }}>{result.stderr}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">No console output</div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
