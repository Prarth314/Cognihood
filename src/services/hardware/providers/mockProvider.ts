
import { HardwareProvider, VehicleSignals, Gear, ActuatorCommands } from '../hardwareTypes';

export class MockProvider implements HardwareProvider {
  name = 'Mock Vehicle Simulator';
  private interval: NodeJS.Timeout | null = null;
  private callback: ((signals: VehicleSignals) => void) | null = null;
  
  private state: VehicleSignals = {
    speedKph: 0,
    rpm: 800,
    brakePressure: 0,
    acceleratorPosition: 0,
    steeringAngle: 0,
    gear: Gear.P,
    odometer: 12450,
    fuelLevel: 0.85,
    isEngineRunning: false,
    timestamp: Date.now(),
  };

  async connect() {
    this.state.isEngineRunning = true;
    this.state.gear = Gear.D;
    this.startSimulation();
  }

  async disconnect() {
    if (this.interval) clearInterval(this.interval);
    this.state.isEngineRunning = false;
  }

  onSignal(callback: (signals: VehicleSignals) => void) {
    this.callback = callback;
  }

  async sendCommand(command: Partial<ActuatorCommands>) {
    console.log('[MockProvider] Received Command:', command);
    if (command.emergencyBrake) {
      this.state.speedKph = 0;
      this.state.brakePressure = 100;
      this.state.acceleratorPosition = 0;
    }
  }

  private startSimulation() {
    this.interval = setInterval(() => {
      // Basic physics simulation
      if (this.state.isEngineRunning) {
        // Simulating some "noise" and gradual speed increase if not braking
        if (this.state.speedKph < 60) {
          this.state.speedKph += Math.random() * 2;
          this.state.acceleratorPosition = 20 + Math.random() * 10;
        } else {
          this.state.speedKph += (Math.random() - 0.5) * 2;
        }
        
        this.state.rpm = 1500 + (this.state.speedKph * 20) + (Math.random() * 100);
        this.state.steeringAngle += (Math.random() - 0.5) * 5;
        this.state.timestamp = Date.now();
        
        if (this.callback) {
          this.callback({ ...this.state });
        }
      }
    }, 100);
  }
}
