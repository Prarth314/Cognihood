import React, { useEffect, useState, useRef } from 'react';
import Button from './ui/Button';

interface AttentionCheckProps {
  active: boolean;
  onPass: () => void;
  onFail: () => void;
}

const PROMPTS = [
  'Tap to confirm you are alert',
  'Eyes on road — tap now',
  'Attention check — respond',
  'Focus reset — tap here',
];

const AttentionCheck: React.FC<AttentionCheckProps> = ({ active, onPass, onFail }) => {
  const [visible, setVisible] = useState(false);
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [progress, setProgress] = useState(100);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const deadlineRef = useRef(0);
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;

  useEffect(() => {
    if (!active) {
      clearTimeout(timeoutRef.current);
      clearInterval(intervalRef.current);
      setVisible(false);
      return;
    }

    const scheduleNext = () => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
        setVisible(true);
        deadlineRef.current = Date.now() + 2500;
        setProgress(100);
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
          const remaining = deadlineRef.current - Date.now();
          setProgress(Math.max(0, (remaining / 2500) * 100));
          if (remaining <= 0) {
            clearInterval(intervalRef.current);
            setVisible(false);
            onFailRef.current();
            scheduleNext();
          }
        }, 50);
      }, 30_000 + Math.random() * 60_000);
    };

    scheduleNext();
    return () => {
      clearTimeout(timeoutRef.current);
      clearInterval(intervalRef.current);
    };
  }, [active]);

  const handlePass = () => {
    clearInterval(intervalRef.current);
    setVisible(false);
    onPass();
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
      setVisible(true);
      deadlineRef.current = Date.now() + 2500;
      setProgress(100);
    }, 30_000 + Math.random() * 60_000);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="attention-check-title">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative ui-card max-w-md w-full text-center space-y-5 border-2 border-[var(--primary)] shadow-lg">
        <div className="text-3xl text-[var(--primary)]" aria-hidden="true">
          <i className="fas fa-bullseye" />
        </div>
        <h3 id="attention-check-title" className="ui-h2">Attention check</h3>
        <p className="ui-body">{prompt}</p>
        <div className="ui-progress">
          <div className="ui-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <Button className="w-full" size="lg" onClick={handlePass}>
          I&apos;m alert — confirm
        </Button>
        <p className="ui-caption">2.5 second response window</p>
      </div>
    </div>
  );
};

export default AttentionCheck;
