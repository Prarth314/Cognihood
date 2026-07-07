
import { CoachingTip, TripEvent, TripRecord } from '../types';

function tip(id: string, icon: string, title: string, text: string, eventRef?: string): CoachingTip {
  return { id, icon, title, text, eventRef };
}

export function generateCoachingTips(trip: TripRecord): CoachingTip[] {
  const tips: CoachingTip[] = [];

  for (const ev of trip.events) {
    switch (ev.type) {
      case 'HARSH_BRAKE': {
        const delay = ev.metadata?.reactionDelaySec ?? 1.2;
        tips.push(tip(
          `tip_${ev.id}`,
          'fa-gauge-high',
          'Brake Modulation',
          `Brake onset was ~${delay.toFixed(1)}s later than your safe baseline. Release throttle earlier before curves or traffic changes to avoid ${ev.metadata?.decelG?.toFixed(1) ?? '0.4'}g deceleration peaks.`,
          ev.id
        ));
        break;
      }
      case 'HARSH_ACCEL':
        tips.push(tip(
          `tip_${ev.id}`,
          'fa-bolt',
          'Smoother Acceleration',
          'Aggressive throttle input detected. Gradual acceleration improves stability and reduces cognitive load during merges.',
          ev.id
        ));
        break;
      case 'HYPNOSIS':
        tips.push(tip(
          `tip_${ev.id}`,
          'fa-road',
          'Highway Hypnosis',
          `Gaze stagnation lasted ${ev.metadata?.durationSec?.toFixed(0) ?? '30'}s. Take a micro-break every 45–60 minutes on monotonous stretches.`,
          ev.id
        ));
        break;
      case 'ATTENTION_FAIL':
        tips.push(tip(
          `tip_${ev.id}`,
          'fa-eye',
          'Attention Response',
          'You missed an attention check. Practice faster gaze re-centering when prompted — this correlates with situational awareness recovery.',
          ev.id
        ));
        break;
      case 'INELIGIBLE':
        tips.push(tip(
          `tip_${ev.id}`,
          'fa-bed',
          'Rest Before Driving',
          'Alertness dropped below safe threshold during this trip. Schedule rest before your next drive.',
          ev.id
        ));
        break;
      case 'RECKLESS_DEVIATION':
        tips.push(tip(
          `tip_${ev.id}`,
          'fa-shield-virus',
          'Atypical Driving Pattern',
          'This trip deviated significantly from your personal baseline and national norms. Review whether fatigue, stress, or distraction was a factor.',
          ev.id
        ));
        break;
      case 'DISTRACTION':
        tips.push(tip(
          `tip_${ev.id}`,
          'fa-mobile',
          'Gaze Discipline',
          'Extended off-road gaze detected. Keep visual scans under 2 seconds before returning focus to the road.',
          ev.id
        ));
        break;
      case 'FATIGUE':
        tips.push(tip(
          `tip_${ev.id}`,
          'fa-moon',
          'Fatigue Management',
          `PERCLOS peaked at ${ev.metadata?.perclos?.toFixed(0) ?? '20'}%. Consider caffeine, ventilation, or a 15-minute rest.`,
          ev.id
        ));
        break;
    }
  }

  if (tips.length === 0 && trip.avgScore >= 90) {
    tips.push(tip('tip_default', 'fa-check-double', 'Excellent Session', 'Consistent alertness and smooth inputs throughout. Maintain your current rest and scan patterns.'));
  }

  if (trip.avgScore < 85 && !tips.some(t => t.title.includes('Brake'))) {
    tips.push(tip('tip_general', 'fa-chart-line', 'Overall Improvement', 'Focus on earlier hazard anticipation and smoother brake release to lift your safety index on the next trip.'));
  }

  return tips.slice(0, 6);
}

export function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatTripDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
}

export function estimateDistanceMi(durationMs: number): number {
  const hours = durationMs / 3_600_000;
  return Math.round(hours * 45 * 10) / 10;
}

export function cogLoadFromScore(avgScore: number, avgCognitive: number): 'LOW' | 'MED' | 'HIGH' {
  if (avgCognitive > 60 || avgScore < 70) return 'HIGH';
  if (avgCognitive > 35 || avgScore < 85) return 'MED';
  return 'LOW';
}

export function tripStateFromScore(avgScore: number): 'SAFE' | 'WARNING' | 'CRITICAL' {
  if (avgScore < 70) return 'CRITICAL';
  if (avgScore < 85) return 'WARNING';
  return 'SAFE';
}
