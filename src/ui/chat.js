// A small chat log + a one-line input, shown while playing online.
const $ = (id) => document.getElementById(id);

class Chat {
  constructor() {
    this.log = $('chat-log');
    this.bar = $('chat-bar');
    this.input = $('chat-input');
    this.isOpen = false;
    this.onSubmit = null;
    this.onClose = null;

    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); this.submit(); }
      else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    });
    // Phaser's keyboard plugin listens on the window and would otherwise eat
    // these keystrokes (and call preventDefault on them) even while this
    // input has focus, so stop them here too.
    this.input.addEventListener('keyup', (e) => e.stopPropagation());
  }

  open() {
    this.isOpen = true;
    this.bar.hidden = false;
    this.input.value = '';
    this.input.focus();
  }

  close() {
    this.isOpen = false;
    this.bar.hidden = true;
    this.input.blur();
    if (this.onClose) this.onClose();
  }

  submit() {
    const text = this.input.value.trim().slice(0, 140);
    this.close();
    if (text && this.onSubmit) this.onSubmit(text);
  }

  /** Add a line to the small on-screen log; oldest lines scroll off. */
  addLine(name, text) {
    const line = document.createElement('div');
    line.className = 'chat-line';
    const strong = document.createElement('strong');
    strong.textContent = name + ': ';
    line.appendChild(strong);
    line.appendChild(document.createTextNode(text));
    this.log.appendChild(line);
    while (this.log.children.length > 6) this.log.removeChild(this.log.firstChild);
    this.log.scrollTop = this.log.scrollHeight;
  }
}

export const chat = new Chat();
