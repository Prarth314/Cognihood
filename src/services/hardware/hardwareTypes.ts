
export enum Gear {
  P = 'P',
  R = 'R',
  N = 'N',
  D = 'D',
  L = 'L'
}

export interface VehicleSignals {
  speedKph: number;
  rpm: number;
  brakePressure: number; // 0 to 100
  acceleratorPosition: number; // 0 to 100
  steeringAngle: number; // -360 to 360
  gear: Gear;
  odometer: number;
  fuelLevel: number; // 0 to 1
  isEngineRunning: boolean;
  timestamp: number;
}

export interface AlertCommands {
  hapticWarning: boolean;
  auditoryAlert: boolean;
  visualAlert: boolean;
}

export interface HardwareProvider {
  name: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  onSignal: (callback: (signals: VehicleSignals) => void) => () => void;
  sendCommand: (command: AlertCommands) => Promise<void>;
}
