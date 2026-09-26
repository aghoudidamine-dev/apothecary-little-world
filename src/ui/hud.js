// Small DOM overlay: room info, "E - Talk" prompt, connection notices.
const $ = (id) => document.getElementById(id);

export const hud = {
  init({ code, online, onLeave }) {
    $('hud').hidden = false;
    $('hud-leave').onclick = onLeave;
    const room = $('hud-room');
    room.hidden = !online;
    if (online) {
      $('hud-code').textContent = code;
      $('hud-copy').onclick = async () => {
        try { await navigator.clipboard.writeText(code); $('hud-copy').textContent = 'Copied'; }
        catch { $('hud-copy').textContent = 'Select the code'; }
        setTimeout(() => { $('hud-copy').textContent = 'Copy'; }, 1500);
      };
    }
  },
  setPlayers(n) { $('hud-players').textContent = n >= 2 ? 'Both players are here' : 'Waiting for a second player'; },
  notice(text) {
    const el = $('hud-notice');
    el.textContent = text || '';
    el.hidden = !text;
  },
  prompt(text) {
    const el = $('prompt');
    el.textContent = text || '';
    el.hidden = !text;
  },
};
