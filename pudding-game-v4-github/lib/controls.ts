import type { Input } from './game';

export type Control = keyof Input;
const KEYS: Record<string, Control> = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
};

/** Each finger/key owns its hold. A short jump tap survives until the next frame. */
export class GameControls {
  private pointers = new Map<number, Control>();
  private keys = new Map<string, Control>();
  private jumpQueued = false;

  pressPointer(id: number, control: Control) {
    this.pointers.set(id, control);
    if (control === 'jump') this.jumpQueued = true;
  }
  releasePointer(id: number) { this.pointers.delete(id); }
  pressKey(code: string, control = KEYS[code]) {
    if (!control) return false;
    if (!this.keys.has(code) && control === 'jump') this.jumpQueued = true;
    this.keys.set(code, control);
    return true;
  }
  releaseKey(code: string) { this.keys.delete(code); }
  queueJump() { this.jumpQueued = true; }
  clear() { this.pointers.clear(); this.keys.clear(); this.jumpQueued = false; }
  consume(): Input {
    const held = new Set([...this.pointers.values(), ...this.keys.values()]);
    const input = { left: held.has('left'), right: held.has('right'), jump: this.jumpQueued };
    this.jumpQueued = false;
    return input;
  }
}
