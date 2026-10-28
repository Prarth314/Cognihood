
import { vhal } from './vhal';
import { SafetyAssessment, SafetyState } from '../../types';
import { VehicleSignals } from './hardwareTypes';

class SafetyController {
  private lastSignals: VehicleSignals | null = null;
  private interventionActive = false;

  constructor() {
    vhal.onSignal((signals) => {
      this.lastSignals = signals;
    });
  }

  processAssessment(assessment: SafetyAssessment) {
    if (!this.lastSignals) return;

    // Decision Logic
    const shouldEmergencyBrake = 
      assessment.state === SafetyState.CRITICAL && 
      this.lastSignals.speedKph > 10;

    const shouldWarn = 
      assessment.state === SafetyState.WARNING;

    if (shouldEmergencyBrake && !this.interventionActive) {
      this.triggerEmergencyIntervention('CRITICAL_FATIGUE_EMERGENCY_BRAKE');
    } else if (shouldWarn) {
      this.triggerWarning();
    }
  }

  private async triggerEmergencyIntervention(reason: string) {
    console.warn(`[SafetyController] TRIGGERING INTERVENTION: ${reason}`);
    this.interventionActive = true;
    
    await vhal.sendCommand({
      emergencyBrake: true,
      auditoryAlert: true,
      visualAlert: true
    });

    // Reset intervention after 5 seconds for simulation purposes
    setTimeout(() => {
      this.interventionActive = false;
      vhal.sendCommand({ emergencyBrake: false });
    }, 5000);
  }

  private triggerWarning() {
    vhal.sendCommand({
      hapticWarning: true,
      auditoryAlert: true
    });
  }
}

export const safetyController = new SafetyController();
