import { readFile } from 'node:fs/promises'

const originalFetch = globalThis.fetch.bind(globalThis)

globalThis.fetch = async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.pathname + input.search
      : input.url

  if (url.startsWith('/data/')) {
    const filePath = `${process.cwd()}/public${url}`
    const raw = await readFile(filePath, 'utf8')
    return new Response(raw, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  return originalFetch(input, init)
}
