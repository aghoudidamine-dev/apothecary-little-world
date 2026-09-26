import { CELL_H, FEET_Y } from '../art/characters.js';

/** Sprite + shadow + name label that moves as one unit. Used for players and NPCs. */
export class Character {
  constructor(scene, key, x, y, labelText) {
    this.scene = scene;
    this.key = key;
    this.dir = 'down';
    this.moving = false;
    this.x = x;
    this.y = y;

    this.shadow = scene.add.image(x, y, 'shadow');
    this.sprite = scene.add.sprite(x, y, 'char_' + key, 0).setOrigin(0.5, FEET_Y / CELL_H);
    this.label = null;
    if (labelText) {
      this.label = scene.add.image(x, y - 32, scene.getLabelTexture(labelText)).setOrigin(0.5, 1);
    }
    this.bubble = null;
    this.bubbleTimer = null;
    this.playAnim();
    this.setPosition(x, y);
  }

  /** Show a speech-bubble with `text` above the character for a few seconds. */
  showChat(text) {
    if (this.bubbleTimer) this.bubbleTimer.remove();
    if (!this.bubble) {
      this.bubble = this.scene.add.text(0, 0, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#2b2238',
        backgroundColor: '#fff8e6',
        padding: { x: 6, y: 4 },
        wordWrap: { width: 160 },
        align: 'center',
      }).setOrigin(0.5, 1).setDepth(200000);
    }
    this.bubble.setText(text).setVisible(true);
    this.positionBubble();
    this.bubbleTimer = this.scene.time.delayedCall(4000, () => this.bubble?.setVisible(false));
  }

  positionBubble() {
    if (this.bubble && this.bubble.visible) {
      this.bubble.setPosition(Math.round(this.x), Math.round(this.y) - 34).setDepth(200000);
    }
  }

  playAnim() {
    this.sprite.play(`${this.key}_${this.moving ? 'walk' : 'idle'}_${this.dir}`, true);
  }

  setState(dir, moving) {
    if (dir === this.dir && moving === this.moving) return;
    this.dir = dir;
    this.moving = moving;
    this.playAnim();
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    const rx = Math.round(x), ry = Math.round(y);
    this.sprite.setPosition(rx, ry).setDepth(y);
    this.shadow.setPosition(rx, ry - 1).setDepth(y - 0.5);
    if (this.label) this.label.setPosition(rx, ry - 27).setDepth(100000);
    this.positionBubble();
  }

  setVisible(v) {
    this.sprite.setVisible(v);
    this.shadow.setVisible(v);
    if (this.label) this.label.setVisible(v);
    if (this.bubble && !v) this.bubble.setVisible(false);
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    if (this.label) this.label.destroy();
    if (this.bubble) this.bubble.destroy();
    if (this.bubbleTimer) this.bubbleTimer.remove();
  }
}
