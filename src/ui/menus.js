import { CHARACTER_SPECS } from '../art/characters.js';
import { drawPortrait } from '../art/registry.js';
import { drawTitleBackdrop } from './titleBackdrop.js';
import { Net } from '../multiplayer/net.js';

const $ = (id) => document.getElementById(id);

const BLURBS = {
  maomao: 'Curious, clever, and always looking for answers. Her knowledge of herbs and medicine is unmatched.',
  jinshi: 'Graceful, charming, and mysterious. He may seem unreachable, but he enjoys your company.',
};

const ERRORS = {
  'no-room': 'No room has that code. Check the letters and try again.',
  'room-full': 'That room already has two players.',
  'character-taken': 'Someone in that room already picked this character. Go back and choose the other one.',
  'bad-request': 'That code is not valid. Room codes have 5 letters or numbers.',
  timeout: 'The multiplayer server did not answer. Try again in a moment.',
  'connect-failed': 'Could not reach the multiplayer server. Check your connection, or that the server is running, then try again.',
};

/** Shows title -> character -> room screens. Resolves with the session to start the game with. */
export function runMenus() {
  return new Promise((resolve) => {
    drawTitleBackdrop($('backdrop'));

    const screens = { title: $('screen-title'), pick: $('screen-pick'), lobby: $('screen-lobby') };
    const show = (name) => {
      for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
      const focus = { title: 'btn-play', pick: 'card-maomao', lobby: intent === 'join' ? 'room-code' : 'btn-create' }[name];
      $(focus)?.focus();
    };
    let intent = 'play';
    let character = null;
    let busy = false;

    // ---- title ----
    $('btn-play').onclick = () => { intent = 'play'; show('pick'); };
    $('btn-join').onclick = () => { intent = 'join'; show('pick'); };

    // ---- character select ----
    for (const key of ['maomao', 'jinshi']) {
      const card = $('card-' + key);
      drawPortrait(card.querySelector('canvas'), key, 9);
      card.querySelector('.card-name').textContent = CHARACTER_SPECS[key].label;
      card.querySelector('.card-blurb').textContent = BLURBS[key];
      card.onclick = () => {
        character = key;
        $('lobby-who').textContent = `Playing as ${CHARACTER_SPECS[key].label}`;
        setStatus('');
        show('lobby');
      };
    }
    $('pick-back').onclick = () => show('title');

    // ---- lobby ----
    const setStatus = (msg, isError = false) => {
      const el = $('lobby-status');
      el.textContent = msg;
      el.classList.toggle('error', isError);
    };
    const setBusy = (b) => {
      busy = b;
      for (const id of ['btn-create', 'btn-join-room', 'btn-solo', 'lobby-back', 'room-code']) $(id).disabled = b;
    };

    async function connectThen(action) {
      if (busy) return;
      setBusy(true);
      setStatus('Connecting to the server...');
      const net = new Net();
      try {
        await net.connect({ onSlow: () => setStatus('Waking the server up. Free hosting can take up to a minute the first time...') });
        const res = await action(net);
        resolve({ character, net, code: res.code, id: res.id, peers: res.peers || [] });
      } catch (e) {
        net.close();
        setStatus(ERRORS[e.message] || ERRORS['connect-failed'], true);
        setBusy(false);
      }
    }

    $('btn-create').onclick = () => connectThen((net) => net.create(character));
    const doJoin = () => {
      const code = $('room-code').value.trim().toUpperCase();
      if (code.length !== 5) { setStatus(ERRORS['bad-request'], true); $('room-code').focus(); return; }
      connectThen((net) => net.join(code, character));
    };
    $('btn-join-room').onclick = doJoin;
    $('room-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') doJoin(); });
    $('room-code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    $('btn-solo').onclick = () => resolve({ character, net: null, code: null, id: null, peers: [] });
    $('lobby-back').onclick = () => show('pick');

    show('title');
  });
}
