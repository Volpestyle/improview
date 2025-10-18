import { useState } from 'react';
import { Button } from './ui/button';
import { Play, Send, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TestResult } from '../types/problem';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

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

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const results = await onRunTests(code);
      setTestResults(results);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { results } = await onSubmit(code);
      setTestResults(results);
    } catch (error) {
      console.error('Submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const lineNumbers = code.split('\n').length;

  return (
    <div className="h-full flex flex-col bg-editor-bg">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">solution.js</span>
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
        <div className="flex">
          {/* Line Numbers */}
          <div className="bg-editor-gutter px-3 py-4 text-editor-comment font-mono select-none border-r border-border">
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
              className="w-full min-h-full bg-editor-bg text-editor-line font-mono px-4 py-4 leading-6 resize-none focus:outline-none"
              style={{ tabSize: 2 }}
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
            className="border-t border-border bg-card overflow-hidden"
          >
            <Tabs defaultValue="results" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4">
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
                        className={`p-3 rounded-lg border ${
                          result.status === 'pass'
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-destructive/10 border-destructive/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-2 flex-1">
                            {result.status === 'pass' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono">
                                  Test {idx + 1}
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground font-mono">
                                  {result.time_ms}ms
                                </span>
                              </div>
                              {result.status === 'fail' && result.expected !== undefined && (
                                <div className="space-y-1 mt-2">
                                  <div className="font-mono">
                                    <span className="text-muted-foreground">Expected: </span>
                                    <span className="text-green-500">{JSON.stringify(result.expected)}</span>
                                  </div>
                                  <div className="font-mono">
                                    <span className="text-muted-foreground">Got: </span>
                                    <span className="text-destructive">{JSON.stringify(result.actual)}</span>
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
                  <div className="p-4 font-mono text-muted-foreground">
                    {testResults.some(r => r.stdout || r.stderr) ? (
                      <div className="space-y-2">
                        {testResults.map((result, idx) => (
                          <div key={idx}>
                            {result.stdout && <div>{result.stdout}</div>}
                            {result.stderr && <div className="text-destructive">{result.stderr}</div>}
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
