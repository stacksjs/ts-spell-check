import { describe, expect, it } from 'bun:test'
import { createDictionary, loadBuiltinDictionary, getProgrammingWords } from '../src/dictionary'

describe('createDictionary', () => {
  it('creates a dictionary from words', () => {
    const dict = createDictionary(['hello', 'world', 'test'])
    expect(dict.has('hello')).toBe(true)
    expect(dict.has('world')).toBe(true)
    expect(dict.has('missing')).toBe(false)
  })

  it('is case-insensitive', () => {
    const dict = createDictionary(['Hello'])
    expect(dict.has('hello')).toBe(true)
    expect(dict.has('HELLO')).toBe(true)
  })

  it('accepts short words (1-2 chars)', () => {
    const dict = createDictionary([])
    expect(dict.has('a')).toBe(true)
    expect(dict.has('xy')).toBe(true)
  })

  it('accepts numbers', () => {
    const dict = createDictionary([])
    expect(dict.has('123')).toBe(true)
    expect(dict.has('42')).toBe(true)
  })

  it('accepts short uppercase acronyms', () => {
    const dict = createDictionary([])
    expect(dict.has('API')).toBe(true)
    expect(dict.has('HTTP')).toBe(true)
    expect(dict.has('DNS')).toBe(true)
  })

  it('includes programming words', () => {
    const dict = createDictionary([])
    expect(dict.has('const')).toBe(true)
    expect(dict.has('async')).toBe(true)
    expect(dict.has('middleware')).toBe(true)
  })

  it('flags forbidden words', () => {
    const flagged = new Set(['badword'])
    const dict = createDictionary([], flagged)
    expect(dict.isFlagged('badword')).toBe(true)
    expect(dict.isFlagged('goodword')).toBe(false)
  })

  it('provides suggestions', () => {
    const dict = createDictionary(['hello', 'help', 'held'])
    const suggestions = dict.suggest('helo')
    expect(suggestions.length).toBeGreaterThan(0)
  })

  it('reports size', () => {
    const dict = createDictionary(['a', 'b', 'c'])
    expect(dict.size).toBeGreaterThan(0)
  })
})

describe('loadBuiltinDictionary', () => {
  it('loads without error', async () => {
    const dict = await loadBuiltinDictionary()
    expect(dict).toBeDefined()
    expect(dict.size).toBeGreaterThan(0)
  })

  it('contains common English words', async () => {
    const dict = await loadBuiltinDictionary()
    expect(dict.has('hello')).toBe(true)
    expect(dict.has('world')).toBe(true)
    expect(dict.has('the')).toBe(true)
    expect(dict.has('function')).toBe(true)
  })
})

describe('getProgrammingWords', () => {
  it('returns a non-empty set', () => {
    const words = getProgrammingWords()
    expect(words.size).toBeGreaterThan(100)
  })

  it('contains expected programming terms', () => {
    const words = getProgrammingWords()
    expect(words.has('async')).toBe(true)
    expect(words.has('middleware')).toBe(true)
    expect(words.has('config')).toBe(true)
    expect(words.has('api')).toBe(true)
  })
})
