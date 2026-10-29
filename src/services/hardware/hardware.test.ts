import { afterEach, expect, it, vi } from 'vitest';
import { VHAL } from './vhal';
import { MockProvider } from './providers/mockProvider';
import { SafetyController } from './safetyController';
import { Gear, type VehicleSignals } from './hardwareTypes';
import { SafetyState } from '../../../types';
afterEach(() => vi.useRealTimers());
const signals = (): VehicleSignals => ({ speedKph: 0, rpm: 0, brakePressure: 0, acceleratorPosition: 0, steeringAngle: 0, gear: Gear.P, odometer: 0, fuelLevel: 0, isEngineRunning: false, timestamp: Date.now() });

it('does not leak mock timers on repeated connections and disconnect', async () => {
  vi.useFakeTimers();
  const provider = new MockProvider(); const listener = vi.fn(); const off = provider.onSignal(listener);
  await provider.connect(); await provider.connect(); await vi.advanceTimersByTimeAsync(200);
  expect(listener).toHaveBeenCalledTimes(2);
  off(); await vi.advanceTimersByTimeAsync(100); expect(listener).toHaveBeenCalledTimes(2);
  await provider.disconnect(); expect(vi.getTimerCount()).toBe(0);
});

it('unsubscribes replaced providers and clears stale telemetry', async () => {
  const bus = new VHAL(); let emit: (value: VehicleSignals) => void = () => {};
  const off = vi.fn(); const disconnect = vi.fn(async () => {});
  await bus.setProvider({ name: 'fixture', connect: async () => {}, disconnect, onSignal: callback => { emit = callback; return off; }, sendCommand: async () => {} });
  await bus.connect(); emit(signals()); expect(bus.getCurrentSignals()).not.toBeNull();
  await bus.setProvider(new MockProvider()); emit(signals());
  expect(bus.getCurrentSignals()).toBeNull(); expect(off).toHaveBeenCalledOnce(); expect(disconnect).toHaveBeenCalledOnce();
  await bus.disconnect();
});

it('deduplicates advisory state cues and withdraws commands for stale data', async () => {
  vi.useFakeTimers();
  const bus = new VHAL(); const sendCommand = vi.fn(async () => {});
  let emit: (value: VehicleSignals) => void = () => {};
  await bus.setProvider({ name: 'fixture', connect: async () => {}, disconnect: async () => {}, onSignal: callback => { emit = callback; return () => {}; }, sendCommand });
  await bus.connect(); emit(signals()); const controller = new SafetyController(bus);
  await controller.processState(SafetyState.CRITICAL); await controller.processState(SafetyState.CRITICAL);
  expect(sendCommand).toHaveBeenCalledOnce();
  expect(sendCommand).toHaveBeenCalledWith({ auditoryAlert: true, visualAlert: true, hapticWarning: true });
  await vi.advanceTimersByTimeAsync(1600); await controller.processState(SafetyState.WARNING);
  expect(sendCommand).toHaveBeenCalledOnce();
  await bus.disconnect();
});
