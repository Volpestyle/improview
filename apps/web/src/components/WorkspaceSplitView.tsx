import { SplitPane, CodeEditorPanel, type CodeEditorPanelProps } from '@improview/ui';
import type { Key } from 'react';
import type { ProblemPack } from '../types/problem';
import { ProblemPanel } from './ProblemPanel';
import { cn } from '../utils/cn';

interface WorkspaceSplitViewProps {
  problem: ProblemPack;
  editorProps: CodeEditorPanelProps;
  editorKey?: Key;
  minLeft?: number;
  minRight?: number;
  initialFraction?: number;
  className?: string;
}

export function WorkspaceSplitView({
  problem,
  editorProps,
  editorKey,
  minLeft = 360,
  minRight = 360,
  initialFraction = 0.5,
  className,
}: WorkspaceSplitViewProps) {
  const { className: editorClassName, ...restEditorProps } = editorProps;

  return (
    <div className={cn('h-full min-h-0', className)}>
      <SplitPane
        className="h-full"
        minLeft={minLeft}
        minRight={minRight}
        initialFraction={initialFraction}
        left={
          <div
            className="h-full border-r bg-[var(--bg-sunken)]"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <ProblemPanel problem={problem} />
          </div>
        }
        right={
          <div className="flex h-full min-h-0 flex-1 flex-col bg-[var(--bg-sunken)]">
            <CodeEditorPanel
              key={editorKey}
              {...restEditorProps}
              className={cn('flex-1 rounded-none border-0 shadow-none', editorClassName)}
            />
          </div>
        }
      />
    </div>
  );
}
