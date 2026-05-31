/**
 * Проверка цепочки media:// (renderer URL → main pathname → file URL).
 * Запуск: node scripts/verify-media-protocol.mjs
 */
import { pathToFileURL } from 'url'
import { existsSync, writeFileSync, unlinkSync, mkdtempSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

function buildMediaSrc(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '')
  return `media:///${encodeURI(normalizedPath)}`
}

function resolveMediaPath(requestUrl, platform) {
  let pathString = decodeURIComponent(new URL(requestUrl).pathname)

  if (platform === 'win32') {
    if (/^\/[a-zA-Z]:\//.test(pathString)) {
      pathString = pathString.slice(1)
    } else if (/^[a-zA-Z]\//.test(pathString)) {
      pathString = pathString[0].toUpperCase() + ':' + pathString.slice(1)
    }
  } else {
    if (pathString.startsWith('//')) {
      pathString = pathString.slice(1)
    }
    if (!pathString.startsWith('/')) {
      pathString = `/${pathString}`
    }
  }

  return pathString
}

const cases = [
  {
    name: 'Linux: абсолютный путь с кириллицей',
    platform: 'linux',
    filePath: '/home/anatoly/Рабочий стол/Screenshot_20260524_185241.png',
    expectResolved: '/home/anatoly/Рабочий стол/Screenshot_20260524_185241.png'
  },
  {
    name: 'Linux: старый баг (двойной слэш в URL)',
    platform: 'linux',
    requestUrl: 'media:////home/anatoly/file.png',
    expectResolved: '/home/anatoly/file.png'
  },
  {
    name: 'Linux: старый баг (home без слэша, regex-стиль)',
    platform: 'linux',
    requestUrl: 'media://home/anatoly/file.png',
    expectResolved: '/anatoly/file.png'
  },
  {
    name: 'Linux: корректный URL после фикса renderer',
    platform: 'linux',
    filePath: '/home/anatoly/file.png',
    expectResolved: '/home/anatoly/file.png'
  },
  {
    name: 'Windows: путь C:\\Users\\...',
    platform: 'win32',
    filePath: 'C:\\Users\\test\\image.png',
    expectResolved: 'C:/Users/test/image.png'
  }
]

let passed = 0
let failed = 0

console.log('=== media:// protocol verification ===\n')

for (const c of cases) {
  let requestUrl = c.requestUrl
  if (!requestUrl && c.filePath) {
    requestUrl = buildMediaSrc(c.filePath)
  }

  const resolved = resolveMediaPath(requestUrl, c.platform)
  const ok = resolved === c.expectResolved

  if (ok) {
    passed++
    console.log(`✓ ${c.name}`)
  } else {
    failed++
    console.log(`✗ ${c.name}`)
    console.log(`  URL:      ${requestUrl}`)
    console.log(`  expected: ${c.expectResolved}`)
    console.log(`  got:      ${resolved}`)
  }
  console.log(`  built:    ${requestUrl}\n`)
}

// Регрессия: старый renderer без strip давал //home на linux
const oldBrokenUrl = buildMediaSrc('/home/x/a.png')
const oldStyleUrl = `media:///${encodeURI('/home/x/a.png')}`
const oldStyleResolved = resolveMediaPath(oldStyleUrl, 'linux')
const newStyleResolved = resolveMediaPath(oldBrokenUrl, 'linux')

console.log('=== Регрессия renderer ===')
console.log(`Новый buildMediaSrc:     ${oldBrokenUrl}`)
console.log(`  → resolve (linux):     ${newStyleResolved}`)
console.log(`Старый build (4 slash):  ${oldStyleUrl}`)
console.log(`  → resolve (linux):     ${oldStyleResolved}`)

if (newStyleResolved === '/home/x/a.png') {
  passed++
  console.log('✓ Новый renderer даёт корректный абсолютный путь\n')
} else {
  failed++
  console.log('✗ Новый renderer: неверный путь\n')
}

if (oldStyleResolved === '/home/x/a.png') {
  passed++
  console.log('✓ Main процесс страхует старый URL с //home\n')
} else {
  failed++
  console.log(`✗ Main не спасает старый URL (got: ${oldStyleResolved})\n`)
}

// Реальный файл на текущей ОС
console.log('=== Проверка file URL на диске ===')
const dir = mkdtempSync(join(tmpdir(), 'brisque-media-test-'))
const testFile = join(dir, 'probe.png')
writeFileSync(testFile, Buffer.from([0x89, 0x50, 0x4e, 0x47]))

const platform = process.platform
const filePathForBuild = testFile
const mediaUrl = buildMediaSrc(filePathForBuild)
const resolvedPath = resolveMediaPath(mediaUrl, platform)
const fileUrl = pathToFileURL(resolvedPath).href
const exists = existsSync(resolvedPath)

console.log(`platform:     ${platform}`)
console.log(`media URL:    ${mediaUrl}`)
console.log(`resolved:     ${resolvedPath}`)
console.log(`file URL:     ${fileUrl}`)
console.log(`existsSync:   ${exists}`)

if (exists) {
  passed++
  console.log('✓ Реальный файл найден через цепочку media → path → file URL\n')
} else {
  failed++
  console.log('✗ Файл не найден после resolve\n')
}

unlinkSync(testFile)

console.log(`=== Итого: ${passed} passed, ${failed} failed ===`)
process.exit(failed > 0 ? 1 : 0)
