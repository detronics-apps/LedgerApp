import { el } from './dom.js';

/** tabs: Array<{id: string, label: string}> */
export function buildNav(tabs, activeId, onSelect) {
  return el('nav', { class: 'app-nav tabbar', role: 'tablist', 'aria-label': 'Sections' },
    tabs.map((t) => el('button', {
      class: `tab${t.id === activeId ? ' tab--active' : ''}`,
      type: 'button', role: 'tab', 'aria-selected': String(t.id === activeId),
      text: t.label,
      on: { click: () => onSelect(t.id) },
    })));
}
