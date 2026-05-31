import { AppController, UiElements } from './AppController'

/**
 * Точка входа renderer-процесса: собирает DOM-элементы и инициализирует AppController.
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

const els: UiElements = {
  openBtn: requireElement('open-btn'),
  zoomInfo: requireElement('zoom-info'),
  workspace: requireElement('workspace'),
  imageWrapper: requireElement('image-wrapper'),
  targetImage: requireElement('target-image'),
  selectionBox: requireElement('selection-box'),
  selectionInfo: requireElement('selection-info'),
  scoreContainer: requireElement('brisque-score-container'),
  scoreVal: requireElement('brisque-score-val'),
  previewCanvas: requireElement('preview-canvas'),
  mapCanvas: requireElement('map-canvas'),
  mapTitle: requireElement('map-title'),
  mapTypeBtns: requireElements('.map-type-btn'),
  chartCanvas: requireElement('chart-canvas'),
  chartTypeBtns: requireElements('.chart-type-btn'),
  chartYModeBtns: requireElements('.chart-y-mode-btn'),
  sidebar: requireElement('sidebar'),
  resizer: requireElement('sidebar-resizer'),
  qaTabsNav: requireElement('qa-tabs-nav'),
  qaTabsContainer: requireElement('qa-tabs-container'),
  tabBtns: requireElements('.tab-btn'),
  tabContents: requireElements('.tab-content'),
  fullscreenOpenBtns: requireElements('.fullscreen-open-btn'),
  fullscreenModal: requireElement('fullscreen-modal'),
  fullscreenTitle: requireElement('fullscreen-title'),
  fullscreenZoomInfo: requireElement('fullscreen-zoom-info'),
  fullscreenCloseBtn: requireElement('fullscreen-close-btn'),
  fullscreenResetBtn: requireElement('fullscreen-reset-btn'),
  fullscreenMapViewport: requireElement('fullscreen-map-viewport'),
  fullscreenMapCanvas: requireElement('fullscreen-map-canvas'),
  fullscreenChartContainer: requireElement('fullscreen-chart-container'),
  fullscreenChartCanvas: requireElement('fullscreen-chart-canvas'),
  fullscreenMapPanel: requireElement('fullscreen-map-panel'),
  fullscreenChartPanel: requireElement('fullscreen-chart-panel'),
  fsMapTypeBtns: requireElements('.fs-map-type-btn'),
  fsChartTypeBtns: requireElements('.fs-chart-type-btn'),
  fsChartYModeBtns: requireElements('.fs-chart-y-mode-btn')
}

new AppController(els)
