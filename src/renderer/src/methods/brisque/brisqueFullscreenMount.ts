import { MapViewportController } from '../../ui/MapViewportController'
import { FullscreenMountHosts, FullscreenSessionHandles } from '../../ui/FullscreenView'
import { ChartManager } from './visualizers/ChartManager'
import { BrisqueMapsPanel } from './panels/BrisqueMapsPanel'
import { BrisqueChartsPanel } from './panels/BrisqueChartsPanel'
import { ChartKind, ChartYMode, MapKind } from './types'

const MAP_KINDS: MapKind[] = ['mu', 'sigma', 'mscn', 'horizontal', 'vertical', 'diagonal1', 'diagonal2']
const CHART_KINDS: ChartKind[] = ['mscn', 'horizontal', 'vertical', 'diagonal1', 'diagonal2']

const MAP_LABELS: Record<MapKind, string> = {
  mu: 'μ',
  sigma: 'σ',
  mscn: 'MSCN',
  horizontal: 'H',
  vertical: 'V',
  diagonal1: 'D1 ↘',
  diagonal2: 'D2 ↙'
}

const CHART_LABELS: Record<ChartKind, string> = {
  mscn: 'MSCN',
  horizontal: 'H',
  vertical: 'V',
  diagonal1: 'D1 ↘',
  diagonal2: 'D2 ↙'
}

/** Заполнение fullscreen для вкладки «Карты» (toolbar + canvas + pan/zoom). */
export function mountMapFullscreen(
  mapsPanel: BrisqueMapsPanel,
  hosts: FullscreenMountHosts
): FullscreenSessionHandles {
  const { toolbarHost, bodyHost, zoomInfo, signal } = hosts

  const toolbar = document.createElement('div')
  toolbar.className = 'chart-toolbar map-toolbar fullscreen-toolbar'
  const nav = document.createElement('div')
  nav.className = 'chart-type-nav map-type-nav'
  toolbar.appendChild(nav)
  toolbarHost.appendChild(toolbar)

  const viewport = document.createElement('div')
  viewport.className = 'fullscreen-map-viewport'
  const canvas = document.createElement('canvas')
  viewport.appendChild(canvas)
  bodyHost.appendChild(viewport)

  const mapViewportCtrl = new MapViewportController(viewport, canvas, zoomInfo)

  MAP_KINDS.forEach(kind => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'map-type-btn' + (kind === mapsPanel.getActiveMapKind() ? ' active' : '')
    btn.dataset.map = kind
    btn.textContent = MAP_LABELS[kind]
    btn.addEventListener(
      'click',
      () => {
        mapsPanel.setMapKind(kind)
        syncMapToolbar(nav, kind)
        mapsPanel.renderMapToCanvas(canvas)
        mapViewportCtrl.fitToView()
      },
      { signal }
    )
    nav.appendChild(btn)
  })

  mapsPanel.renderMapToCanvas(canvas)
  requestAnimationFrame(() => mapViewportCtrl.fitToView())

  return {
    onResize: () => {
      mapsPanel.renderMapToCanvas(canvas)
      mapViewportCtrl.fitToView()
    },
    onReset: () => mapViewportCtrl.reset()
  }
}

/** Заполнение fullscreen для вкладки «Графики». */
export function mountChartFullscreen(
  chartsPanel: BrisqueChartsPanel,
  hosts: FullscreenMountHosts
): FullscreenSessionHandles {
  const { toolbarHost, bodyHost, signal } = hosts

  const toolbar = document.createElement('div')
  toolbar.className = 'chart-toolbar fullscreen-toolbar'

  const typeNav = document.createElement('div')
  typeNav.className = 'chart-type-nav'
  CHART_KINDS.forEach(kind => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className =
      'chart-type-btn' + (kind === chartsPanel.getActiveChartKind() ? ' active' : '')
    btn.dataset.chart = kind
    btn.textContent = CHART_LABELS[kind]
    btn.addEventListener(
      'click',
      () => {
        chartsPanel.setChartKind(kind)
        syncChartTypeToolbar(typeNav, kind)
        renderFsChart()
      },
      { signal }
    )
    typeNav.appendChild(btn)
  })
  toolbar.appendChild(typeNav)

  const yNav = document.createElement('div')
  yNav.className = 'chart-y-mode-nav'
  yNav.innerHTML = '<span class="chart-y-mode-label">Ось Y:</span>'
  ;(['pdf', 'peak'] as ChartYMode[]).forEach(yMode => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className =
      'chart-y-mode-btn' + (yMode === chartsPanel.getActiveChartYMode() ? ' active' : '')
    btn.dataset.yMode = yMode
    btn.textContent = yMode === 'pdf' ? 'PDF' : 'Max-Norm'
    btn.addEventListener(
      'click',
      () => {
        chartsPanel.setChartYMode(yMode)
        syncChartYToolbar(yNav, yMode)
        renderFsChart()
      },
      { signal }
    )
    yNav.appendChild(btn)
  })
  toolbar.appendChild(yNav)
  toolbarHost.appendChild(toolbar)

  const container = document.createElement('div')
  container.className = 'fullscreen-chart-container'
  const canvas = document.createElement('canvas')
  container.appendChild(canvas)
  bodyHost.appendChild(container)

  const chartManager = new ChartManager(canvas)
  const renderFsChart = (): void => {
    chartsPanel.renderChartToCanvas(canvas, chartManager)
  }

  // После layout контейнера (ChartManager берёт размер из parent.getBoundingClientRect).
  requestAnimationFrame(() => renderFsChart())

  return {
    onResize: () => renderFsChart()
  }
}

function syncMapToolbar(nav: HTMLElement, active: MapKind): void {
  nav.querySelectorAll<HTMLButtonElement>('.map-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.map === active)
  })
}

function syncChartTypeToolbar(nav: HTMLElement, active: ChartKind): void {
  nav.querySelectorAll<HTMLButtonElement>('.chart-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.chart === active)
  })
}

function syncChartYToolbar(nav: HTMLElement, active: ChartYMode): void {
  nav.querySelectorAll<HTMLButtonElement>('.chart-y-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.yMode === active)
  })
}
