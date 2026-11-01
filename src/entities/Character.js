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
    this.pose = 'stand';
    this.depthOverride = null;
    this.extras = [];
    this.playAnim();
    this.setPosition(x, y);
  }

  /** Show a speech-bubble with `text` above the character for a few seconds. */
  showChat(text) {
    const PAD_X = 8, PAD_Y = 5, TAIL = 7;
    if (this.bubbleTimer) this.bubbleTimer.remove();
    if (!this.bubble) {
      this.bubbleBg = this.scene.add.graphics();
      this.bubbleText = this.scene.add.text(0, 0, '', {
        fontFamily: '"Palatino Linotype", Palatino, Georgia, serif',
        fontSize: '12px',
        color: '#fff8e6',
        wordWrap: { width: 150, useAdvancedWrap: true },
        align: 'center',
        lineSpacing: 3,
      }).setOrigin(0.5, 1);
      this.bubble = this.scene.add.container(0, 0, [this.bubbleBg, this.bubbleText]).setDepth(200000);
    }
    this.bubbleText.setText(text).setPosition(0, -TAIL - PAD_Y);
    const w = Math.ceil(this.bubbleText.width) + PAD_X * 2;
    const h = Math.ceil(this.bubbleText.height) + PAD_Y * 2;
    const bg = this.bubbleBg;
    bg.clear();
    bg.fillStyle(0x1c1526, 0.94);
    bg.fillRect(-w / 2, -TAIL - h, w, h);
    bg.fillTriangle(-6, -TAIL, 6, -TAIL, 0, 0);
    bg.lineStyle(2, 0xd4ad62, 1);
    bg.strokeRect(-w / 2, -TAIL - h, w, h);
    bg.beginPath(); bg.moveTo(-6, -TAIL); bg.lineTo(0, 0); bg.lineTo(6, -TAIL); bg.strokePath();
    this.bubble.setVisible(true);
    this.positionBubble();
    this.bubbleTimer = this.scene.time.delayedCall(4000, () => this.bubble?.setVisible(false));
  }

  positionBubble() {
    if (this.bubble && this.bubble.visible) {
      this.bubble.setPosition(Math.round(this.x), Math.round(this.y) - 30);
    }
  }

  /** Receive a little gift: a flower icon floats up above the character, who gives a happy bounce. */
  showGift(kind) {
    if (!this.giftIcon) {
      this.giftIcon = this.scene.add.image(0, 0, 'icon_' + kind).setOrigin(0.5, 1).setDepth(210000);
    }
    if (this.giftTween) this.giftTween.stop();
    if (this.bounceTween) this.bounceTween.stop();
    const startY = Math.round(this.y) - 28;
    this.giftIcon.setTexture('icon_' + kind).setPosition(Math.round(this.x), startY).setAlpha(1).setScale(0.6).setVisible(true);
    this.scene.tweens.add({ targets: this.giftIcon, scale: 1, duration: 180, ease: 'Back.Out' });
    this.giftTween = this.scene.tweens.add({
      targets: this.giftIcon, y: startY - 20, alpha: 0, duration: 1500, delay: 300, ease: 'Cubic.Out',
      onComplete: () => this.giftIcon?.setVisible(false),
    });
    this.sprite.setScale(1);
    this.bounceTween = this.scene.tweens.add({
      targets: this.sprite, scaleX: 1.22, scaleY: 1.22, duration: 160, yoyo: true, repeat: 1, ease: 'Quad.Out',
    });

    // a couple of little hearts, so she looks genuinely happy about it
    [{ delay: 200, dx: -7 }, { delay: 480, dx: 7 }].forEach(({ delay, dx }) => {
      this.scene.time.delayedCall(delay, () => {
        if (!this.sprite?.scene) return; // character was destroyed in the meantime
        const heart = this.scene.add.image(Math.round(this.x) + dx, Math.round(this.y) - 30, 'icon_heart')
          .setOrigin(0.5, 1).setDepth(210001).setScale(0.5).setAlpha(0.95);
        this.scene.tweens.add({
          targets: heart, y: heart.y - 16, alpha: 0, scale: 0.85, duration: 750, ease: 'Cubic.Out',
          onComplete: () => heart.destroy(),
        });
      });
    });
  }


  /**
   * 'stand' (normal), 'bath' (soaking in the pool: head and shoulders above the water,
   * a towel on the head) or 'sleep' (head on the pillow, little z's floating up).
   */
  setPose(pose, opts = {}) {
    if (pose === this.pose) return;
    this.clearExtras();
    this.pose = pose;
    this.depthOverride = null;
    const sc = this.scene;
    if (this.label) this.label.setVisible(pose !== 'sleep' && this.sprite.visible);
    if (pose === 'stand') {
      this.sprite.setCrop(); this.shadow.setVisible(this.sprite.visible);
      this.moving = false; this.playAnim();
      return;
    }
    this.dir = 'down'; this.moving = false; this.playAnim();
    this.shadow.setVisible(false);
    if (pose === 'bath') {
      this.sprite.setCrop(0, 0, 20, 16);
      const ring = sc.add.ellipse(0, 0, 22, 6, 0xd7eba0, 0.75).setStrokeStyle(1, 0xf2fbd0, 0.9);
      const ring2 = sc.add.ellipse(0, 0, 30, 9, 0xd7eba0, 0.25);
      const towel = sc.add.rectangle(0, 0, 9, 3, 0xfdf8ea).setStrokeStyle(1, 0x8b8b80);
      this.extras = [{ obj: ring2, dx: 0, dy: -10 + 1, d: 0.2 }, { obj: ring, dx: 0, dy: -10, d: 0.4 }, { obj: towel, dx: 0, dy: -23, d: 0.6 }];
    } else if (pose === 'sleep') {
      this.sprite.setCrop(0, 0, 20, 13);
      this.depthOverride = opts.depth ?? 65; // just above the bed sprite
      const z = sc.add.text(0, 0, 'z', { fontFamily: 'Georgia, serif', fontSize: '11px', color: '#fff8e6', stroke: '#2b2238', strokeThickness: 3 }).setOrigin(0.5);
      this.extras = [{ obj: z, dx: 12, dy: -30, d: 0.6, bob: true }];
    }
    this.setPosition(this.x, this.y);
  }

  placeExtras() {
    const t = this.scene.time ? this.scene.time.now : 0;
    for (const e of this.extras || []) {
      const bob = e.bob ? Math.sin(t / 300) * 2 : 0;
      e.obj.setPosition(Math.round(this.x) + e.dx, Math.round(this.y) + e.dy + bob).setDepth((this.depthOverride ?? this.y) + e.d + 1);
    }
  }

  clearExtras() {
    for (const e of this.extras || []) e.obj.destroy();
    this.extras = [];
  }

  playAnim() {
    this.sprite.play(`${this.key}_${this.moving ? 'walk' : 'idle'}_${this.dir}`, true);
  }

  /** Switch which outfit texture this character renders with (same identity, new look). */
  setOutfit(key) {
    if (this.key === key) return;
    this.key = key;
    this.playAnim();
  }

  setState(dir, moving) {
    if (this.pose !== 'stand') return; // soaking / sleeping: stay put
    if (dir === this.dir && moving === this.moving) return;
    this.dir = dir;
    this.moving = moving;
    this.playAnim();
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    const rx = Math.round(x), ry = Math.round(y);
    this.sprite.setPosition(rx, ry).setDepth(this.depthOverride ?? y);
    this.shadow.setPosition(rx, ry - 1).setDepth(y - 0.5);
    this.placeExtras();
    if (this.label) this.label.setPosition(rx, ry - 27).setDepth(100000);
    this.positionBubble();
  }

  setVisible(v) {
    this.sprite.setVisible(v);
    this.shadow.setVisible(v);
    if (this.label) this.label.setVisible(v);
    if (this.bubble && !v) this.bubble.setVisible(false);
    if (this.giftIcon && !v) this.giftIcon.setVisible(false);
    for (const e of this.extras || []) e.obj.setVisible(v);
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    if (this.label) this.label.destroy();
    if (this.bubble) this.bubble.destroy();
    if (this.bubbleTimer) this.bubbleTimer.remove();
    this.clearExtras();
    if (this.giftIcon) this.giftIcon.destroy();
    if (this.giftTween) this.giftTween.stop();
    if (this.bounceTween) this.bounceTween.stop();
  }
}
