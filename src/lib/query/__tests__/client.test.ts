import { describe, it, expect, beforeEach, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

// Reset module entre tests para limpiar el singleton
beforeEach(() => {
  vi.resetModules()
})

describe('makeQueryClient', () => {
  it('returns a QueryClient instance', async () => {
    const { makeQueryClient } = await import('../client')
    const client = makeQueryClient()
    expect(client).toBeInstanceOf(QueryClient)
  })

  it('has staleTime of 60 seconds', async () => {
    const { makeQueryClient } = await import('../client')
    const client = makeQueryClient()
    const defaults = client.getDefaultOptions()
    expect(defaults.queries?.staleTime).toBe(60_000)
  })

  it('has gcTime of 5 minutes', async () => {
    const { makeQueryClient } = await import('../client')
    const client = makeQueryClient()
    const defaults = client.getDefaultOptions()
    expect(defaults.queries?.gcTime).toBe(300_000)
  })

  it('browser singleton returns same instance on repeated calls', async () => {
    const { getBrowserClient } = await import('../client')
    const a = getBrowserClient()
    const b = getBrowserClient()
    expect(a).toBe(b)
  })
})
