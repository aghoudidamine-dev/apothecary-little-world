import { OUTFITS } from '../art/characters.js';
import { drawPortrait } from '../art/registry.js';

const $ = (id) => document.getElementById(id);

/** A pop-up list of the outfits for one character; pick with click, 1-3, arrows + Enter. */
class WardrobeMenu {
  constructor() {
    this.root = $('wardrobe');
    this.list = $('wardrobe-list');
    this.isOpen = false;
    this.sel = 0;
    this.rows = [];
    this.onKey = (e) => this.handleKey(e);
  }

  open(character, current, onPick, onClose) {
    this.onPick = onPick;
    this.onClose = onClose;
    this.sel = current;
    this.list.textContent = '';
    this.rows = OUTFITS[character].map((o, i) => {
      const row = document.createElement('button');
      row.className = 'wardrobe-row';
      row.type = 'button';
      const canvas = document.createElement('canvas');
      drawPortrait(canvas, o.key, 3);
      const text = document.createElement('span');
      text.className = 'wardrobe-name';
      text.textContent = `${i + 1}. ${o.name}`;
      row.append(canvas, text);
      if (i === current) {
        const tag = document.createElement('span');
        tag.className = 'wardrobe-tag';
        tag.textContent = 'wearing';
        row.append(tag);
      }
      row.onclick = () => this.pick(i);
      this.list.append(row);
      return row;
    });
    this.refresh();
    this.root.hidden = false;
    this.isOpen = true;
    window.addEventListener('keydown', this.onKey, true);
  }

  refresh() { this.rows.forEach((r, i) => r.classList.toggle('selected', i === this.sel)); }

  handleKey(e) {
    if (!this.isOpen) return;
    const k = e.key;
    if (['ArrowUp', 'w', 'W'].includes(k)) this.sel = (this.sel + this.rows.length - 1) % this.rows.length;
    else if (['ArrowDown', 's', 'S'].includes(k)) this.sel = (this.sel + 1) % this.rows.length;
    else if (k >= '1' && k <= String(this.rows.length)) return this.finish(e, Number(k) - 1);
    else if (['Enter', ' ', 'e', 'E'].includes(k)) { if (e.repeat) return e.preventDefault(); return this.finish(e, this.sel); }
    else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); return this.close(); }
    else return;
    e.preventDefault(); e.stopPropagation();
    this.refresh();
  }

  finish(e, i) { e.preventDefault(); e.stopPropagation(); this.pick(i); }

  pick(i) {
    const cb = this.onPick;
    this.close();
    if (cb) cb(i);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.hidden = true;
    window.removeEventListener('keydown', this.onKey, true);
    if (this.onClose) this.onClose();
  }
}

export const wardrobeMenu = new WardrobeMenu();
