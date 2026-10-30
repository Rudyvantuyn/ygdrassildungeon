import { audio } from '../audio/audio';

export interface MenuItem {
  label: string;
  detail?: string;
  description?: string;
  disabled?: boolean;
  onSelect: () => void;
  onFocus?: () => void;
  /** A control shown at the right of the row (a slider, a set of choices) instead of `detail`. */
  control?: HTMLElement;
  /** Left/right on this row: change its value. */
  onAdjust?: (step: -1 | 1) => void;
}

export interface MenuOptions {
  onCancel?: () => void;
  /** Set false where a visible Back row would be in the way (the fight's command menus). */
  backRow?: boolean;
  /** Element that shows the focused item's description. */
  descriptionEl?: HTMLElement;
  startIndex?: number;
}

/** Vertical list menu driven by arrow keys / Enter / Escape, or by pointer. */
export class ListMenu {
  readonly el: HTMLElement;
  private readonly items: MenuItem[];
  private index = 0;

  constructor(
    items: MenuItem[],
    private opts: MenuOptions = {},
  ) {
    // A menu that can be left with Escape also gets a Back row, unless it already has a way out.
    const exits = /^(back|leave|close|done|not yet|cancel|no|keep|got it|continue|return|load|ok)\b/i;
    if (opts.onCancel && opts.backRow !== false && !items.some((it) => exits.test(it.label))) {
      const cancel = opts.onCancel;
      items = [...items, { label: 'Back', onSelect: cancel }];
    }
    this.items = items;
    this.el = document.createElement('div');
    this.el.className = 'menu';
    this.index = Math.min(opts.startIndex ?? 0, Math.max(0, this.items.length - 1));
    this.items.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'menu-item' + (item.disabled ? ' disabled' : '');
      row.innerHTML = `<span></span>${item.detail && !item.control ? '<span class="detail"></span>' : ''}`;
      row.children[0].textContent = item.label;
      if (item.control) {
        row.classList.add('has-control');
        row.append(item.control);
      } else if (item.detail) row.children[1].textContent = item.detail;
      row.addEventListener('pointerenter', () => this.focus(i));
      row.addEventListener('click', (e) => {
        this.focus(i);
        // Clicks on a row's own control (a slider) only change that control.
        if (item.control?.contains(e.target as Node)) return;
        this.select();
      });
      this.el.appendChild(row);
    });
    this.focus(this.index);
    this.el.addEventListener('scroll', () => this.markOverflow(), { passive: true });
    // Sizes are only known once the menu is on screen.
    requestAnimationFrame(() => this.markOverflow());
  }

  /** Fades the top or bottom edge of a scrolling menu when there is more to see there. */
  private markOverflow(): void {
    const el = this.el;
    el.classList.toggle('more-above', el.scrollTop > 2);
    el.classList.toggle('more-below', el.scrollTop + el.clientHeight < el.scrollHeight - 2);
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
    // Long menus scroll inside their dialog: keep the chosen row in view.
    const row = this.el.children[this.index] as HTMLElement | undefined;
    if (row && this.el.scrollHeight > this.el.clientHeight) {
      if (row.offsetTop < this.el.scrollTop) this.el.scrollTop = row.offsetTop;
      else if (row.offsetTop + row.offsetHeight > this.el.scrollTop + this.el.clientHeight) this.el.scrollTop = row.offsetTop + row.offsetHeight - this.el.clientHeight;
    }
    this.markOverflow();
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
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'a':
      case 'A':
      case 'd':
      case 'D': {
        const adjust = this.items[this.index]?.onAdjust;
        if (!adjust) return false;
        adjust(key === 'ArrowLeft' || key === 'a' || key === 'A' ? -1 : 1);
        return true;
      }
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
