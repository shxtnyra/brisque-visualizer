import { AppController, ShellElements } from './AppController'
import { FullscreenShellElements } from './ui/FullscreenView'

/**
 * Точка входа renderer-процесса: собирает DOM оболочки и инициализирует AppController.
 */
declare global {
  interface Window {
    api: { openFile: () => Promise<string | null> }
  }
}

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) {
    throw new Error(`DOM: не найден элемент #${id}`)
  }
  return el as T
}

const fullscreen: FullscreenShellElements = {
  modal: requireElement('fullscreen-modal'),
  title: requireElement('fullscreen-title'),
  zoomInfo: requireElement('fullscreen-zoom-info'),
  closeBtn: requireElement('fullscreen-close-btn'),
  resetBtn: requireElement('fullscreen-reset-btn'),
  toolbarHost: requireElement('fullscreen-toolbar-host'),
  bodyHost: requireElement('fullscreen-body-host'),
  hint: requireElement('fullscreen-hint')
}

const els: ShellElements = {
  openBtn: requireElement('open-btn'),
  methodSelectContainer: requireElement('method-select-container'),
  zoomInfo: requireElement('zoom-info'),
  workspace: requireElement('workspace'),
  imageWrapper: requireElement('image-wrapper'),
  targetImage: requireElement('target-image'),
  selectionBox: requireElement('selection-box'),
  selectionInfo: requireElement('selection-info'),
  scoreContainer: requireElement('brisque-score-container'),
  scoreLabel: requireElement('brisque-score-label'),
  scoreVal: requireElement('brisque-score-val'),
  previewCanvas: requireElement('preview-canvas'),
  sidebar: requireElement('sidebar'),
  resizer: requireElement('sidebar-resizer'),
  qaTabsNav: requireElement('qa-tabs-nav'),
  qaTabsContainer: requireElement('qa-tabs-container'),
  fullscreen
}

new AppController(els)

console.log('renderer.ts loaded')
