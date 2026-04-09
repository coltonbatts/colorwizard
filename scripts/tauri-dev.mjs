import net from 'node:net'
import path from 'node:path'
import { spawn } from 'node:child_process'

const DEFAULT_PORT = Number(process.env.TAURI_DEV_PORT || '3000')
const MAX_PORT = DEFAULT_PORT + 50

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.on('error', () => resolve(false))
    server.listen({ host: '127.0.0.1', port }, () => {
      server.close(() => resolve(true))
    })
  })
}

async function findPort(start, end) {
  for (let port = start; port <= end; port += 1) {
    if (await isPortFree(port)) return port
  }
  throw new Error(`No free port found between ${start} and ${end}`)
}

const port = await findPort(DEFAULT_PORT, MAX_PORT)
const tauriBin = path.join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tauri.cmd' : 'tauri',
)

const mergedConfig = JSON.stringify({
  build: {
    devUrl: `http://localhost:${port}`,
    beforeDevCommand: `next dev -p ${port}`,
  },
})

console.log(`[tauri:dev] Using Next/Tauri dev port ${port}`)

const child = spawn(tauriBin, ['dev', '--config', mergedConfig], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    TAURI_DEV_PORT: String(port),
  },
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
