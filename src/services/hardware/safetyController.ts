import type { VHAL } from './vhal';
import { SafetyState } from '../../../types';

// Bench-test alerts only: no steering, braking, speed or vehicle-control API.
export class SafetyController {
  private previous: SafetyState | null = null;
  constructor(private bus: VHAL) {}

  async processState(state: SafetyState) {
    const signals = this.bus.getCurrentSignals();
    if (!signals || Date.now() - signals.timestamp > 1500 || signals.timestamp > Date.now() + 1000) {
      this.previous = null;
      return;
    }
    if (state === this.previous) return;
    this.previous = state;
    const active = state === SafetyState.WARNING || state === SafetyState.CRITICAL;
    try {
      await this.bus.sendCommand({ auditoryAlert: active, visualAlert: active, hapticWarning: state === SafetyState.CRITICAL });
    } catch (error) { this.previous = null; throw error; }
  }
}
