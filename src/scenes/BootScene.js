import Phaser from 'phaser';
import { buildMap } from '../world/mapData.js';
import { bakeGround, buildObjectSprites, packAtlas, makeFlowerIcon } from '../art/environment.js';
import { CHARACTER_SPECS, CELL_W, CELL_H, DIRS, makeShadow } from '../art/characters.js';
import { getSheet } from '../art/registry.js';

/** Turns the procedurally drawn art into Phaser textures + animations, then starts the game. */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    const map = buildMap();
    this.registry.set('map', map);

    this.textures.addCanvas('ground', bakeGround(map));

    const atlas = packAtlas(buildObjectSprites());
    const objects = this.textures.addCanvas('objects', atlas.canvas);
    for (const [name, f] of Object.entries(atlas.frames)) objects.add(name, 0, f.x, f.y, f.w, f.h);

    this.textures.addCanvas('shadow', makeShadow());
    this.textures.addCanvas('icon_flower', makeFlowerIcon());

    for (const key of Object.keys(CHARACTER_SPECS)) {
      const tex = this.textures.addCanvas('char_' + key, getSheet(key));
      DIRS.forEach((dir, row) => {
        for (let col = 0; col < 4; col++) tex.add(row * 4 + col, 0, col * CELL_W, row * CELL_H, CELL_W, CELL_H);
        const frame = (c) => ({ key: 'char_' + key, frame: row * 4 + c });
        this.anims.create({ key: `${key}_walk_${dir}`, frames: [1, 0, 3, 0].map(frame), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${key}_idle_${dir}`, frames: [0, 2].map(frame), frameRate: 2, repeat: -1 });
      });
    }

    this.scene.start('Game');
  }
}
