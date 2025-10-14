import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'motion/react';

interface TimerProps {
  estimatedMinutes: number;
  onTimeUp?: () => void;
  autoStart?: boolean;
}

export function Timer({ estimatedMinutes, onTimeUp, autoStart = true }: TimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const targetSeconds = estimatedMinutes * 60;

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSeconds(s => {
        const newSeconds = s + 1;
        if (newSeconds >= targetSeconds && onTimeUp) {
          onTimeUp();
        }
        return newSeconds;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, targetSeconds, onTimeUp]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const percentage = Math.min((seconds / targetSeconds) * 100, 100);
  const isOvertime = seconds > targetSeconds;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-2"
    >
      <div className="relative w-32">
        <div className="flex items-baseline gap-1">
          <span className={`font-mono ${isOvertime ? 'text-destructive' : 'text-foreground'}`}>
            {formatTime(seconds)}
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono text-muted-foreground">
            {formatTime(targetSeconds)}
          </span>
        </div>
        <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
          <motion.div
            className={`h-full ${isOvertime ? 'bg-destructive' : 'bg-primary'}`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => {
            setSeconds(0);
            setIsRunning(false);
          }}
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
    </motion.div>
  );
}
