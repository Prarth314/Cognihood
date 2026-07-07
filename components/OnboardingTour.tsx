import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import { AppView } from './layout/AppShell';

const STORAGE_KEY = 'cognihood_onboarding_done';

interface Step {
  id: string;
  title: string;
  body: string;
  views: AppView[];
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'Welcome to CogniHood',
    body: 'Monitor driver alertness in real time, detect highway hypnosis, and review trip performance synced to the cloud.',
    views: ['selector'],
  },
  {
    id: 'nav',
    title: 'Quick navigation',
    body: 'Use the sidebar to jump between Home, Start Trip, Live Drive, and Archives. On mobile, tap the menu icon.',
    views: ['selector', 'records', 'predrive', 'dashboard'],
  },
  {
    id: 'live',
    title: 'Start a monitored trip',
    body: 'Choose Live monitoring → complete the 15-second pre-drive scan → your camera feeds local face tracking and periodic cloud vision analysis.',
    views: ['selector'],
  },
  {
    id: 'archives',
    title: 'Track improvement over time',
    body: 'Trip archives show safety trends, coaching tips, and national benchmarks. Export CogniLogs anytime.',
    views: ['records', 'selector'],
  },
];

interface OnboardingTourProps {
  currentView: AppView;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ currentView }) => {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === 'true') return;
    if (currentView === 'landing') return;
    setVisible(true);
  }, [currentView]);

  if (!visible) return null;

  const applicable = STEPS.filter(s => s.views.includes(currentView));
  const step = applicable[stepIndex] ?? STEPS[stepIndex];
  if (!step) return null;

  const isLast = stepIndex >= STEPS.length - 1;

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  const next = () => {
    if (isLast) finish();
    else setStepIndex(i => i + 1);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[150]" role="dialog" aria-labelledby="onboarding-title">
      <div className="ui-card shadow-lg border-[var(--primary)]/30 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="ui-caption text-[var(--primary)] font-medium">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
            <h2 id="onboarding-title" className="ui-h2 mt-1">{step.title}</h2>
          </div>
          <button
            type="button"
            onClick={finish}
            className="ui-caption hover:text-[var(--text-primary)]"
            aria-label="Dismiss onboarding"
          >
            Skip
          </button>
        </div>
        <p className="ui-body">{step.body}</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={finish}>
            Got it
          </Button>
          <Button className="flex-1" onClick={next}>
            {isLast ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
