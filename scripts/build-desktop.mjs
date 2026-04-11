import { spawn } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const child = spawn(npmCommand, ['run', 'build'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    COLORWIZARD_DESKTOP_BUILD: '1',
  },
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
