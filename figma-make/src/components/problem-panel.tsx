import { useState } from 'react';
import { ProblemPack } from '../types/problem';
import { Button } from './ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Badge } from './ui/badge';
import { Eye, EyeOff, Code2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollArea } from './ui/scroll-area';

interface ProblemPanelProps {
  problem: ProblemPack;
}

export function ProblemPanel({ problem }: ProblemPanelProps) {
  const [hintVisible, setHintVisible] = useState(false);

  return (
    <ScrollArea className="h-full">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="p-6 space-y-6"
      >
        {/* Title */}
        <div>
          <h1 className="mb-2">{problem.problem.title}</h1>
          <div className="flex gap-2">
            <Badge variant="outline" className="font-mono">
              {problem.time_estimate_minutes} min
            </Badge>
            <Badge variant="outline" className="font-mono">
              {problem.api.function_name}
            </Badge>
          </div>
        </div>

        {/* Statement */}
        <div className="prose prose-invert max-w-none">
          <div
            className="text-foreground leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: problem.problem.statement.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 bg-muted rounded text-sm font-mono">$1</code>')
                .replace(/\n\n/g, '</p><p class="mt-4">')
            }}
          />
        </div>

        {/* Examples */}
        <div className="space-y-3">
          <h3>Examples</h3>
          {problem.problem.examples.map((example, idx) => (
            <div key={idx} className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div>
                <div className="text-muted-foreground mb-1">Input:</div>
                <code className="block bg-muted px-3 py-2 rounded font-mono">
                  {JSON.stringify(example.input, null, 2)}
                </code>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Output:</div>
                <code className="block bg-muted px-3 py-2 rounded font-mono">
                  {JSON.stringify(example.output)}
                </code>
              </div>
              {example.explanation && (
                <div className="text-muted-foreground italic">
                  {example.explanation}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Constraints */}
        <div className="space-y-2">
          <h3>Constraints</h3>
          <ul className="space-y-1 text-muted-foreground">
            {problem.problem.constraints.map((constraint, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <code className="font-mono">{constraint}</code>
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
          <AnimatePresence>
            {hintVisible && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-foreground"
              >
                💡 {problem.hint}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Solutions */}
        <Accordion type="single" collapsible className="border border-border rounded-lg">
          <AccordionItem value="solutions" className="border-0">
            <AccordionTrigger className="px-4 hover:no-underline">
              <span className="flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Example Solutions
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                {problem.solutions.map((solution, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4>{solution.approach}</h4>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="font-mono">
                          Time: {solution.complexity.time}
                        </Badge>
                        <Badge variant="secondary" className="font-mono">
                          Space: {solution.complexity.space}
                        </Badge>
                      </div>
                    </div>
                    <pre className="bg-editor-panel border border-border rounded-lg p-4 overflow-x-auto">
                      <code className="font-mono text-editor-line">{solution.code}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </motion.div>
    </ScrollArea>
  );
}
