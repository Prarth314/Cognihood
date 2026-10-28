import React, { useEffect, useRef, useState } from 'react';
import { SafetyAssessment, SafetyState } from '../types';
import { speakCalm } from '../services/ttsService';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

const InterventionPanel: React.FC<{ assessment: SafetyAssessment | null }> = ({ assessment }) => {
  const [playing, setPlaying] = useState(false);
  const [hardwareAlertError, setHardwareAlertError] = useState<string | null>(null);
  const criticalAlertActive = useRef(false);
  const text = assessment?.intervention || 'No coaching recommendation is active. Continue attentive driving.';

  useEffect(() => {
    const isCritical = assessment?.state === SafetyState.CRITICAL;
    if (!isCritical) {
      criticalAlertActive.current = false;
      setHardwareAlertError(null);
      return;
    }

    if (import.meta.env.VITE_ENABLE_HARDWARE_BRIDGE !== 'true' || criticalAlertActive.current) return;
    criticalAlertActive.current = true;

    void fetch('/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'critical' }),
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Hardware bridge returned HTTP ${response.status}`);
      }
      setHardwareAlertError(null);
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown bridge error';
      console.error('Physical critical alert could not be activated.', error);
      setHardwareAlertError(`Physical buzzer unavailable: ${message}`);
    });
  }, [assessment?.state]);

  const handlePlay = async () => {
    setPlaying(true);
    try {
      await speakCalm(text);
    } finally {
      setTimeout(() => setPlaying(false), 2000);
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="ui-h3">Coaching</h3>
        {assessment?.autonomyLevel && (
          <Badge tone="primary">{assessment.autonomyLevel}</Badge>
        )}
      </div>

      <div className="p-4 rounded-lg bg-[var(--bg-muted)] border border-[var(--border)] space-y-3">
        <p className="ui-caption font-medium">Recommendation</p>
        <p className="ui-body italic">&ldquo;{text}&rdquo;</p>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            iconOnly
            onClick={handlePlay}
            disabled={playing}
            aria-label={playing ? 'Playing coaching audio' : 'Play coaching audio'}
          >
            <i className={cnIcon(playing ? 'fa-volume-high' : 'fa-play')} aria-hidden="true" />
          </Button>
          <div className="flex-1 ui-progress" role="progressbar" aria-label="Coaching audio progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={playing ? 100 : 33}>
            <div
              className="ui-progress-bar"
              style={{
                width: playing ? '100%' : '33%',
                background: 'var(--secondary)',
                transition: 'width 2s ease',
              }}
            />
          </div>
        </div>
      </div>

      {hardwareAlertError && (
        <p className="ui-caption text-[var(--error)]" role="alert">{hardwareAlertError}</p>
      )}
      <p className="ui-caption">Optional Raspberry Pi buzzer alerts are enabled only in the local kiosk build. CogniHood does not control the vehicle.</p>
    </Card>
  );
};

function cnIcon(cls: string) {
  return `fas ${cls}`;
}

export default InterventionPanel;
