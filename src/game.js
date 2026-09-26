import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';

/** Start the Phaser game for a chosen character (and optional network session). */
export function startGame(session) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-root',
    width: 480,               // small internal resolution, scaled up = crisp pixels + cheap to render
    height: 270,
    backgroundColor: '#2b2238',
    pixelArt: true,
    roundPixels: true,
    disableContextMenu: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, GameScene],
    callbacks: {
      preBoot: (g) => g.registry.set('session', session),
    },
  });
  return game;
}
