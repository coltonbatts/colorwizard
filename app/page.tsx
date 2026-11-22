import HomeSwitch from '@/components/HomeSwitch'
import WebHome from '@/components/WebHome'

// Set by `scripts/build-desktop.mjs`, `scripts/tauri-dev.mjs` and `npm run dev:tauri`.
// Desktop keeps HomeSwitch (it opens the workbench); the web server-renders the simple app.
const isDesktopBuild = process.env.COLORWIZARD_DESKTOP === '1'

export default function Home() {
  return isDesktopBuild ? <HomeSwitch /> : <WebHome />
}
