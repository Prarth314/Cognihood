import type { VehicleSignals, AlertCommands, HardwareProvider } from './hardwareTypes';

// Optional development interface. Synthetic telemetry never feeds trip scoring.
export class VHAL {
  private provider: HardwareProvider | null = null;
  private signalListeners = new Set<(signals: VehicleSignals) => void>();
  private currentSignals: VehicleSignals | null = null;
  private unsubscribe: (() => void) | undefined;
  private generation = 0;
  private connected = false;

  async setProvider(provider: HardwareProvider) {
    const generation = ++this.generation;
    const previous = this.provider;
    this.provider = null; this.connected = false; this.currentSignals = null;
    this.unsubscribe?.(); this.unsubscribe = undefined;
    await previous?.disconnect();
    if (generation !== this.generation) return;
    this.provider = provider;
    this.unsubscribe = provider.onSignal(signals => {
      if (!this.connected || generation !== this.generation) return;
      this.currentSignals = { ...signals };
      this.signalListeners.forEach(listener => listener({ ...signals }));
    });
  }

  async connect() {
    const provider = this.provider;
    const generation = this.generation;
    if (!provider) throw new Error('No hardware provider set');
    await provider.connect();
    if (generation !== this.generation) { await provider.disconnect(); return; }
    this.connected = true;
  }

  async disconnect() {
    ++this.generation;
    this.connected = false; this.currentSignals = null;
    this.unsubscribe?.(); this.unsubscribe = undefined;
    const provider = this.provider; this.provider = null;
    await provider?.disconnect();
  }

  onSignal(callback: (signals: VehicleSignals) => void) {
    this.signalListeners.add(callback);
    return () => { this.signalListeners.delete(callback); };
  }

  async sendCommand(command: AlertCommands) {
    if (this.connected) await this.provider?.sendCommand({ ...command });
  }

  getCurrentSignals(): VehicleSignals | null {
    return this.currentSignals ? { ...this.currentSignals } : null;
  }
}

export const vhal = new VHAL();
