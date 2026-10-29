import { audio } from '../audio/audio';

export interface MenuItem {
  label: string;
  detail?: string;
  description?: string;
  disabled?: boolean;
  onSelect: () => void;
  onFocus?: () => void;
}

export interface MenuOptions {
  onCancel?: () => void;
  /** Element that shows the focused item's description. */
  descriptionEl?: HTMLElement;
  startIndex?: number;
}

/** Vertical list menu driven by arrow keys / Enter / Escape, or by pointer. */
export class ListMenu {
  readonly el: HTMLElement;
  private index = 0;

  constructor(
    private readonly items: MenuItem[],
    private opts: MenuOptions = {},
  ) {
    this.el = document.createElement('div');
    this.el.className = 'menu';
    this.index = Math.min(opts.startIndex ?? 0, Math.max(0, items.length - 1));
    items.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'menu-item' + (item.disabled ? ' disabled' : '');
      row.innerHTML = `<span></span>${item.detail ? '<span class="detail"></span>' : ''}`;
      row.children[0].textContent = item.label;
      if (item.detail) row.children[1].textContent = item.detail;
      row.addEventListener('pointerenter', () => this.focus(i));
      row.addEventListener('click', () => {
        this.focus(i);
        this.select();
      });
      this.el.appendChild(row);
    });
    this.focus(this.index);
  }

  /** Shows the focused item's description in `target` from now on. */
  describeInto(target: HTMLElement): void {
    this.opts.descriptionEl = target;
    this.focus(this.index);
  }

  get selectedIndex(): number {
    return this.index;
  }

  focus(i: number): void {
    if (this.items.length === 0) return;
    this.index = (i + this.items.length) % this.items.length;
    [...this.el.children].forEach((row, j) => row.classList.toggle('selected', j === this.index));
    const item = this.items[this.index];
    if (this.opts.descriptionEl) this.opts.descriptionEl.textContent = item.description ?? '';
    item.onFocus?.();
  }

  select(): void {
    const item = this.items[this.index];
    if (!item) return;
    if (item.disabled) {
      audio.play('menuBack');
      return;
    }
    audio.play('menuSelect');
    item.onSelect();
  }

  /** Returns true when the key was handled. */
  handleKey(key: string): boolean {
    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.focus(this.index - 1);
        audio.play('menuMove');
        return true;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.focus(this.index + 1);
        audio.play('menuMove');
        return true;
      case 'Enter':
      case ' ':
      case 'z':
      case 'Z':
        this.select();
        return true;
      case 'Escape':
      case 'Backspace':
      case 'x':
      case 'X':
        if (this.opts.onCancel) {
          audio.play('menuBack');
          this.opts.onCancel();
          return true;
        }
        return false;
    }
    return false;
  }
}
