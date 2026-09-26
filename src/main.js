import './style.css';
import { runMenus } from './ui/menus.js';
import { startGame } from './game.js';

runMenus().then((session) => {
  document.body.classList.add('playing');
  window.__game = startGame(session); // handy for debugging in the console
  window.__session = session;
});
