const BRIDGE_HTTP = 'http://localhost:8000'

export interface WikiConfig {
  root: string
  exists: boolean
  writable: boolean
}

export interface WikiSaveResult {
  path: string
  bytes: number
  modifiedAt: number
}

export interface WikiFileResult {
  exists: boolean
  path: string
  content?: string
  bytes?: number
  modifiedAt?: number
}

export interface WikiListEntry {
  path: string
  bytes: number
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return typeof body?.detail === 'string' ? body.detail : res.statusText
  } catch {
    return res.statusText || `${res.status}`
  }
}

export async function getWikiConfig(): Promise<WikiConfig> {
  const res = await fetch(`${BRIDGE_HTTP}/api/wiki/config`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function setWikiRoot(root: string): Promise<WikiConfig> {
  const res = await fetch(`${BRIDGE_HTTP}/api/wiki/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ root }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function saveWikiFile(path: string, content: string): Promise<WikiSaveResult> {
  const res = await fetch(`${BRIDGE_HTTP}/api/wiki/save`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function readWikiFile(path: string): Promise<WikiFileResult> {
  const res = await fetch(`${BRIDGE_HTTP}/api/wiki/file?path=${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function listWikiFiles(): Promise<{ root: string; files: WikiListEntry[] }> {
  const res = await fetch(`${BRIDGE_HTTP}/api/wiki/list`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

/** Client-side path validation mirroring the bridge's `_safe_wiki_path`. */
export function validateWikiPath(relative: string): string | null {
  const p = relative.trim()
  if (!p) return 'path is required'
  if (p.startsWith('/') || p.startsWith('~')) return 'path must be relative to wiki root'
  if (p.includes('\0')) return 'invalid character'
  const parts = p.replace(/\\/g, '/').split('/').filter(Boolean)
  if (parts.some(s => s === '..' || s === '.')) return "'.' / '..' not allowed"
  if (!p.endsWith('.md')) return 'must end with .md'
  return null
}
