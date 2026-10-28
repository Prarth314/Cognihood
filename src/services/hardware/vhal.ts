
import { VehicleSignals, ActuatorCommands, HardwareProvider } from './hardwareTypes';

class VHAL {
  private provider: HardwareProvider | null = null;
  private signalListeners: ((signals: VehicleSignals) => void)[] = [];
  private currentSignals: VehicleSignals | null = null;

  setProvider(provider: HardwareProvider) {
    if (this.provider) {
      this.provider.disconnect();
    }
    this.provider = provider;
    this.provider.onSignal((signals) => {
      this.currentSignals = signals;
      this.signalListeners.forEach((listener) => listener(signals));
    });
  }

  async connect() {
    if (!this.provider) throw new Error('No hardware provider set');
    await this.provider.connect();
  }

  async disconnect() {
    if (this.provider) {
      await this.provider.disconnect();
    }
  }

  onSignal(callback: (signals: VehicleSignals) => void) {
    this.signalListeners.push(callback);
    return () => {
      this.signalListeners = this.signalListeners.filter((l) => l !== callback);
    };
  }

  async sendCommand(command: Partial<ActuatorCommands>) {
    if (!this.provider) return;
    await this.provider.sendCommand(command);
  }

  getCurrentSignals(): VehicleSignals | null {
    return this.currentSignals;
  }
}

export const vhal = new VHAL();
