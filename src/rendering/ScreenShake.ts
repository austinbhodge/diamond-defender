import * as createjs from '@thegraid/createjs-module';

export class ScreenShake {
  private stage: createjs.Stage;
  private intensity: number = 0;
  private duration: number = 0;
  private timer: number = 0;

  constructor(stage: createjs.Stage) {
    this.stage = stage;
  }

  /** Trigger a new shake. Stacks with existing if more intense. */
  public trigger(intensity: number, duration: number): void {
    if (intensity > this.intensity) {
      this.intensity = intensity;
    }
    this.duration = Math.max(this.duration, duration);
    this.timer = 0;
  }

  /** Call at start of each frame. Applies random offset, decays. */
  public update(): void {
    // Reset stage position first to prevent drift
    this.stage.x = 0;
    this.stage.y = 0;

    if (this.duration <= 0) return;

    this.timer++;

    // Decaying intensity over duration
    const progress = this.timer / this.duration;
    const currentIntensity = this.intensity * (1 - progress);

    if (currentIntensity > 0.1) {
      this.stage.x = (Math.random() - 0.5) * 2 * currentIntensity;
      this.stage.y = (Math.random() - 0.5) * 2 * currentIntensity;
    }

    if (this.timer >= this.duration) {
      this.intensity = 0;
      this.duration = 0;
      this.timer = 0;
    }
  }

  /** Small shake — player takes damage. */
  public triggerSmall(): void {
    this.trigger(3, 8);
  }

  /** Medium shake — big enemy dies. */
  public triggerMedium(): void {
    this.trigger(6, 12);
  }

  public reset(): void {
    this.intensity = 0;
    this.duration = 0;
    this.timer = 0;
    this.stage.x = 0;
    this.stage.y = 0;
  }
}
