import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type TokenPriceData = { usd?: number; usd_24h_change?: number }

type PriceCache = { ts: number; data: Record<string, TokenPriceData> }

const memPriceCache: Record<string, PriceCache> = {}

export async function fetchErc20Prices(platform: string, addresses: string[], ttlMs = 180_000): Promise<Record<string, TokenPriceData>> {
  try {
    const addrs = Array.from(new Set(addresses.map(a => (a || '').toLowerCase()).filter(Boolean)))
    if (addrs.length === 0) return {}
    const key = `price:${platform}`
    const now = Date.now()

    let cache: PriceCache | null = null
    try {
      if (memPriceCache[platform] && now - memPriceCache[platform].ts < ttlMs) {
        cache = memPriceCache[platform]
      } else {
        const ls = localStorage.getItem(key)
        cache = ls ? JSON.parse(ls) as PriceCache : null
      }
    } catch {}

    const fresh = cache && now - cache.ts < ttlMs
    const allCached = Boolean(fresh && addrs.every(a => cache!.data[a] !== undefined))
    if (allCached && cache) {
      const out: Record<string, TokenPriceData> = {}
      for (const a of addrs) out[a] = cache.data[a]
      return out
    }

    const url = `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${encodeURIComponent(addrs.join(','))}&vs_currencies=usd&include_24hr_change=true`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      return {}
    }
    const data = await res.json()
    const map: Record<string, TokenPriceData> = {}
    for (const a of addrs) {
      const rec = data[a] || data[a.toLowerCase()] || data[a.toUpperCase()]
      if (rec) {
        const usd = typeof rec.usd === 'number' ? rec.usd : Number(rec.usd)
        const ch = typeof rec.usd_24h_change === 'number' ? rec.usd_24h_change : Number(rec.usd_24h_change)
        map[a] = { usd: isFinite(usd) ? usd : undefined, usd_24h_change: isFinite(ch) ? ch : undefined }
      }
    }
    const merged = { ...(cache?.data || {}), ...map }
    const nextCache: PriceCache = { ts: now, data: merged }
    memPriceCache[platform] = nextCache
    try { localStorage.setItem(key, JSON.stringify(nextCache)) } catch {}
    const out: Record<string, TokenPriceData> = {}
    for (const a of addrs) if (merged[a]) out[a] = merged[a]
    return out
  } catch {
    return {}
  }
}
