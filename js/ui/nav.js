import { el } from './dom.js';

/** tabs: Array<{id: string, label: string} | {sep: true}> - a `sep` entry renders a hairline
 * dividing tabs of a different kind (e.g. the employee's own pages from company-wide pages),
 * not a different topic within the same kind. */
export function buildNav(tabs, activeId, onSelect) {
  return el('nav', { class: 'app-nav tabbar', role: 'tablist', 'aria-label': 'Sections' },
    tabs.map((t) => t.sep
      ? el('span', { class: 'tab-sep', 'aria-hidden': 'true' })
      : el('button', {
          class: `tab${t.id === activeId ? ' tab--active' : ''}`,
          type: 'button', role: 'tab', 'aria-selected': String(t.id === activeId),
          text: t.label,
          on: { click: () => onSelect(t.id) },
        })));
}
