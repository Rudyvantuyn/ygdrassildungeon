export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: { id?: string; className?: string; text?: string } = {},
  children: Node[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (attrs.id) node.id = attrs.id;
  if (attrs.className) node.className = attrs.className;
  if (attrs.text !== undefined) node.textContent = attrs.text;
  for (const child of children) node.appendChild(child);
  return node;
}

export function floater(container: HTMLElement, x: number, y: number, text: string, className = ''): void {
  const node = el('div', { className: `floater ${className}`, text });
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  container.appendChild(node);
  window.setTimeout(() => node.remove(), 950);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
