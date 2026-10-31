export type CameraState = 'pending' | 'ready' | 'muted' | 'ended' | 'denied' | 'unavailable' | 'closed';

/** Owns one permission request and stream. Late grants never outlive the owner. */
export class CameraLease {
  private stream: MediaStream | null = null;
  private closed = false;
  private removers: (() => void)[] = [];
  constructor(private video: Pick<HTMLVideoElement, 'srcObject'>, private publish: (state: CameraState) => void,
    private acquire = () => navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })) {}
  async start(): Promise<boolean> {
    this.publish('pending');
    try {
      const stream = await this.acquire();
      if (this.closed) { stream.getTracks().forEach(track => track.stop()); return false; }
      this.stream = stream;
      const tracks = stream.getVideoTracks();
      if (!tracks.length || tracks.some(track => track.readyState === 'ended')) { this.close(); this.publish('ended'); return false; }
      for (const track of tracks) {
        const ended = () => { this.close(); this.publish('ended'); };
        const update = () => this.publish(tracks.some(item => item.muted) ? 'muted' : 'ready');
        for (const [event, listener] of [['ended', ended], ['mute', update], ['unmute', update]] as const) {
          track.addEventListener(event, listener); this.removers.push(() => track.removeEventListener(event, listener));
        }
      }
      this.video.srcObject = stream;
      this.publish(tracks.some(track => track.muted) ? 'muted' : 'ready');
      return true;
    } catch (error) {
      if (!this.closed) this.publish((error as { name?: string })?.name === 'NotAllowedError' ? 'denied' : 'unavailable');
      return false;
    }
  }
  setVisible(visible: boolean) { this.stream?.getVideoTracks().forEach(track => { track.enabled = visible; }); }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.removers.splice(0).forEach(remove => remove());
    this.stream?.getTracks().forEach(track => track.stop());
    if (this.video.srcObject === this.stream) this.video.srcObject = null;
    this.stream = null;
    this.publish('closed');
  }
}
