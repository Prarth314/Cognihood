import React, { useState } from 'react';
import { SafetyAssessment } from '../types';
import { speakCalm } from '../services/ttsService';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

const InterventionPanel: React.FC<{ assessment: SafetyAssessment | null }> = ({ assessment }) => {
  const [playing, setPlaying] = useState(false);
  const text = assessment?.intervention || 'Optimizing cabin atmosphere for your current cognitive state.';

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
          <div className="flex-1 ui-progress">
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

      <div className="flex flex-wrap gap-3 ui-caption">
        <span className="flex items-center gap-1.5"><i className="fas fa-lungs" aria-hidden="true" /> Guided breath</span>
        <span className="flex items-center gap-1.5"><i className="fas fa-music" aria-hidden="true" /> Focus audio</span>
        <span className="flex items-center gap-1.5"><i className="fas fa-temperature-half" aria-hidden="true" /> Cabin 68°F</span>
      </div>
    </Card>
  );
};

function cnIcon(cls: string) {
  return `fas ${cls}`;
}

export default InterventionPanel;
