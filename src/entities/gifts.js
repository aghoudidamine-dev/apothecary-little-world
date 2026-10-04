const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Tosses a small gift icon from `fromChar` to `toChar` in a gentle arc, then
 * calls `toChar.showGift(kind)` once it lands. Runs the same way on whichever
 * client calls it — the giver's screen (fromChar = me, toChar = the remote
 * partner) and the receiver's screen (fromChar = the remote giver, toChar = me)
 * both animate identically since each has its own live reference to both characters.
 */
export function playGiftToss(scene, fromChar, toChar, kind = 'flower') {
  const icon = scene.add.image(fromChar.x, fromChar.y - 16, 'icon_' + kind)
    .setOrigin(0.5, 0.5)
    .setDepth(220000)
    .setScale(0.85);
  const goingRight = toChar.x >= fromChar.x;
  const obj = { t: 0 };
  scene.tweens.add({
    targets: obj,
    t: 1,
    duration: 550,
    ease: 'Sine.easeInOut',
    onUpdate: () => {
      const t = obj.t;
      const x = lerp(fromChar.x, toChar.x, t);
      const baseY = lerp(fromChar.y - 16, toChar.y - 16, t);
      const arc = Math.sin(Math.PI * t) * 22; // little toss-up arc
      icon.setPosition(x, baseY - arc);
      icon.setRotation(Math.sin(t * Math.PI) * (goingRight ? 0.5 : -0.5));
    },
    onComplete: () => {
      icon.destroy();
      toChar.showGift(kind);
    },
  });
}
