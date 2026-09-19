import { el, clear } from './ui/dom.js';

export const APP_VERSION = '0.1.0';

const dom = {};

function buildHeader() {
  return el('header', { class: 'app-header' }, [
    el('div', { class: 'brand' }, [
      el('img', { class: 'brand__logo', src: 'assets/favicon.svg', alt: '' }),
      el('span', { class: 'brand__name', text: 'Impact Ledger' }),
    ]),
    el('div', { class: 'header-actions', id: 'header-actions' }),
  ]);
}

function buildFooter() {
  return el('footer', { class: 'app-footer' }, [
    el('span', { text: 'Research Square Engineering Services - pilot.' }),
    el('span', { text: `v${APP_VERSION}` }),
  ]);
}

function init() {
  dom.main = el('main', { class: 'app-main', id: 'main' },
    el('p', { class: 'muted', text: 'Loading...' }));
  document.body.append(buildHeader(), dom.main, buildFooter());
}

init();
