import { expect, it, vi } from 'vitest';
import { CameraLease } from './cameraLease';
function fixture() {
  const track = Object.assign(new EventTarget(), { readyState: 'live', muted: false, enabled: true, stop: vi.fn() });
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
  const video = { srcObject: null as MediaStream | null }; const publish = vi.fn();
  return { track, stream, video, publish };
}
it('stops a permission grant arriving after cancellation and never attaches it', async () => {
  const f = fixture(); let grant!: (stream: MediaStream) => void;
  const lease = new CameraLease(f.video, f.publish, () => new Promise(resolve => { grant = resolve; }));
  const pending = lease.start(); lease.close(); grant(f.stream);
  expect(await pending).toBe(false); expect(f.track.stop).toHaveBeenCalledOnce(); expect(f.video.srcObject).toBeNull();
  expect(f.publish.mock.calls.map(([state]) => state)).toEqual(['pending', 'closed']);
});
it('publishes denial safely without logging browser/device errors', async () => {
  const f = fixture(); const lease = new CameraLease(f.video, f.publish, async () => { throw { name: 'NotAllowedError', deviceId: 'must-not-log' }; });
  expect(await lease.start()).toBe(false); expect(f.publish).toHaveBeenLastCalledWith('denied');
});
it('withdraws on mute/end, handles visibility, stops all tracks and removes listeners', async () => {
  const f = fixture(); const lease = new CameraLease(f.video, f.publish, async () => f.stream);
  expect(await lease.start()).toBe(true); expect(f.video.srcObject).toBe(f.stream);
  lease.setVisible(false); expect(f.track.enabled).toBe(false);
  lease.setVisible(true); expect(f.track.enabled).toBe(true);
  f.track.muted = true; f.track.dispatchEvent(new Event('mute')); expect(f.publish).toHaveBeenLastCalledWith('muted');
  f.track.muted = false; f.track.dispatchEvent(new Event('unmute')); expect(f.publish).toHaveBeenLastCalledWith('ready');
  f.track.dispatchEvent(new Event('ended')); expect(f.publish).toHaveBeenLastCalledWith('ended');
  const count = f.publish.mock.calls.length; f.track.dispatchEvent(new Event('unmute')); lease.close();
  expect(f.publish).toHaveBeenCalledTimes(count); expect(f.track.stop).toHaveBeenCalledOnce(); expect(f.video.srcObject).toBeNull();
});
