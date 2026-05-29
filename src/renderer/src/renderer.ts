import { AppController, UiElements } from './AppController'

/**
 * Точка входа для renderer-процесса: собирает DOM-элементы и инициализирует
 * главный контроллер приложения `AppController`.
 */
export {}
declare global {
  interface Window {
    api: { openFile: () => Promise<string | null> }
  }
}

const els: UiElements = {
  openBtn: document.getElementById('open-btn') as HTMLButtonElement,
  zoomInfo: document.getElementById('zoom-info') as HTMLSpanElement,
  workspace: document.getElementById('workspace') as HTMLDivElement,
  imageWrapper: document.getElementById('image-wrapper') as HTMLDivElement,
  targetImage: document.getElementById('target-image') as HTMLImageElement,
  selectionBox: document.getElementById('selection-box') as HTMLDivElement,
  selectionInfo: document.getElementById('selection-info') as HTMLDivElement,
  scoreContainer: document.getElementById('brisque-score-container') as HTMLDivElement,
  scoreVal: document.getElementById('brisque-score-val') as HTMLDivElement,
  previewCanvas: document.getElementById('preview-canvas') as HTMLCanvasElement,
  muCanvas: document.getElementById('mu-canvas') as HTMLCanvasElement,
  sigmaCanvas: document.getElementById('sigma-canvas') as HTMLCanvasElement,
  mscnCanvas: document.getElementById('mscn-canvas') as HTMLCanvasElement,
  mscnChartCanvas: document.getElementById('mscn-chart-canvas') as HTMLCanvasElement,
  sidebar: document.getElementById('sidebar') as HTMLDivElement,
  resizer: document.getElementById('sidebar-resizer') as HTMLDivElement,
  qaTabsNav: document.getElementById('qa-tabs-nav') as HTMLDivElement,
  qaTabsContainer: document.getElementById('qa-tabs-container') as HTMLDivElement,
  tabBtns: document.querySelectorAll('.tab-btn') as NodeListOf<HTMLElement>,
  tabContents: document.querySelectorAll('.tab-content') as NodeListOf<HTMLElement>
}

new AppController(els)
