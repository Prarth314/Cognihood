
import { CoachingTip, TripEvent, TripRecord } from '../types';

function tip(id: string, icon: string, title: string, text: string, eventRef?: string): CoachingTip {
  return { id, icon, title, text, eventRef };
}

export function generateCoachingTips(trip: TripRecord): CoachingTip[] {
  const tips: CoachingTip[] = [];

  for (const ev of trip.events) {
    switch (ev.type) {
      case 'HARSH_BRAKE': {
        tips.push(tip(
          `tip_${ev.id}`,
          'fa-gauge-high',
          'Brake Modulation',
          `A phone-motion change was classified as a possible braking event (${ev.metadata?.decelG?.toFixed(1) ?? 'unknown'}g estimate). Review it cautiously because browser motion data is not vehicle-calibrated.`,
          ev.id
        ));
        break;
      }
      case 'HARSH_ACCEL':
        tips.push(tip(
          `tip_${ev.id}`,
          'fa-bolt',
          'Smoother Acceleration',
          'A phone-motion change was classified as possible acceleration. Browser motion data is not vehicle-calibrated, so treat this as an estimate.',
          ev.id
        ));
        break;
      case 'HYPNOSIS':
        tips.push(tip(
          `tip_${ev.id}`,
          'fa-road',
          'Low-engagement pattern',
          `Limited head-pose variation lasted ${ev.metadata?.durationSec?.toFixed(0) ?? '30'}s. If you feel tired or unfocused, stop somewhere safe and rest.`,
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
          'This session differed from your personal reference. Review the raw events and context rather than treating this as a diagnosis or driving judgment.',
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
          `The estimated eye-closure ratio reached ${ev.metadata?.perclos?.toFixed(0) ?? '20'}%. If you feel drowsy, stop in a safe location and rest; do not rely on this estimate alone.`,
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
