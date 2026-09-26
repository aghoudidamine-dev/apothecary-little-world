import { drawPortrait } from '../art/registry.js';

// Bottom-of-screen dialogue box with a typewriter effect.
class Dialogue {
  constructor() {
    this.root = document.getElementById('dialogue');
    this.nameEl = document.getElementById('dialogue-name');
    this.textEl = document.getElementById('dialogue-text');
    this.portrait = document.getElementById('dialogue-portrait');
    this.lines = [];
    this.index = 0;
    this.timer = null;
    this.full = '';
    this.isOpen = false;
  }

  open(name, spriteKey, lines) {
    this.lines = lines;
    this.index = 0;
    this.isOpen = true;
    this.nameEl.textContent = name;
    drawPortrait(this.portrait, spriteKey, 5, { headOnly: true });
    this.root.hidden = false;
    this.show();
  }

  show() {
    clearInterval(this.timer);
    this.full = this.lines[this.index];
    this.textEl.textContent = '';
    let n = 0;
    this.timer = setInterval(() => {
      n++;
      this.textEl.textContent = this.full.slice(0, n);
      if (n >= this.full.length) clearInterval(this.timer);
    }, 22);
  }

  /** Space / Enter: finish the current line, or go to the next one, or close. */
  advance() {
    if (this.textEl.textContent.length < this.full.length) {
      clearInterval(this.timer);
      this.textEl.textContent = this.full;
      return;
    }
    if (this.index + 1 < this.lines.length) { this.index++; this.show(); } else this.close();
  }

  close() {
    clearInterval(this.timer);
    this.isOpen = false;
    this.root.hidden = true;
  }
}

export const dialogue = new Dialogue();
