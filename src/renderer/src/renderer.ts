import { AppController, ShellElements } from './AppController'
import { FullscreenModalElements } from './ui/FullscreenModal'

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

function requireElements<T extends HTMLElement>(selector: string): NodeListOf<T> {
  const nodes = document.querySelectorAll(selector)
  if (nodes.length === 0) {
    throw new Error(`DOM: не найдены элементы "${selector}"`)
  }
  return nodes as NodeListOf<T>
}

const fullscreen: FullscreenModalElements = {
  modal: requireElement('fullscreen-modal'),
  title: requireElement('fullscreen-title'),
  zoomInfo: requireElement('fullscreen-zoom-info'),
  closeBtn: requireElement('fullscreen-close-btn'),
  resetBtn: requireElement('fullscreen-reset-btn'),
  mapViewport: requireElement('fullscreen-map-viewport'),
  mapCanvas: requireElement('fullscreen-map-canvas'),
  chartContainer: requireElement('fullscreen-chart-container'),
  chartCanvas: requireElement('fullscreen-chart-canvas'),
  mapPanel: requireElement('fullscreen-map-panel'),
  chartPanel: requireElement('fullscreen-chart-panel'),
  mapTypeBtns: requireElements('.fs-map-type-btn'),
  chartTypeBtns: requireElements('.fs-chart-type-btn'),
  chartYModeBtns: requireElements('.fs-chart-y-mode-btn')
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
