import { describe, expect, it } from 'bun:test'
import { Trie } from '../src/trie'

describe('Trie — exhaustive edge cases', () => {
  // ─── Insert & lookup ──────────────────────────────────────────

  it('handles single character words', () => {
    const t = new Trie()
    t.insert('a')
    t.insert('i')
    expect(t.has('a')).toBe(true)
    expect(t.has('i')).toBe(true)
    expect(t.has('b')).toBe(false)
    expect(t.size).toBe(2)
  })

  it('handles very long words', () => {
    const t = new Trie()
    const long = 'supercalifragilisticexpialidocious'
    t.insert(long)
    expect(t.has(long)).toBe(true)
    expect(t.has(long.slice(0, -1))).toBe(false)
  })

  it('handles unicode characters', () => {
    const t = new Trie()
    t.insert('cafe')
    expect(t.has('cafe')).toBe(true)
  })

  it('handles words sharing long prefixes', () => {
    const t = new Trie()
    t.insert('international')
    t.insert('internationalize')
    t.insert('internationalization')
    expect(t.has('international')).toBe(true)
    expect(t.has('internationalize')).toBe(true)
    expect(t.has('internationalization')).toBe(true)
    expect(t.has('internation')).toBe(false)
    expect(t.size).toBe(3)
  })

  it('insert is idempotent — duplicates do not increase size', () => {
    const t = new Trie()
    t.insert('word')
    t.insert('word')
    t.insert('word')
    expect(t.size).toBe(1)
  })

  it('handles mixed case lookups consistently', () => {
    const t = new Trie()
    t.insert('TypeScript')
    expect(t.has('typescript')).toBe(true)
    expect(t.has('TYPESCRIPT')).toBe(true)
    expect(t.has('TypeScript')).toBe(true)
    expect(t.has('tYpEsCrIpT')).toBe(true)
  })

  // ─── Prefix operations ────────────────────────────────────────

  it('hasPrefix returns false for empty trie', () => {
    const t = new Trie()
    expect(t.hasPrefix('any')).toBe(false)
  })

  it('hasPrefix handles empty string', () => {
    const t = new Trie()
    t.insert('word')
    // empty prefix matches the root which has children
    expect(t.hasPrefix('')).toBe(true)
  })

  it('getWordsWithPrefix respects limit', () => {
    const t = new Trie()
    for (let i = 0; i < 100; i++) t.insert(`test${i}`)
    const results = t.getWordsWithPrefix('test', 5)
    expect(results.length).toBe(5)
  })

  it('getWordsWithPrefix returns empty for non-existent prefix', () => {
    const t = new Trie()
    t.insert('hello')
    expect(t.getWordsWithPrefix('xyz')).toEqual([])
  })

  // ─── Suggestions ──────────────────────────────────────────────

  it('suggests exact match with distance 0', () => {
    const t = new Trie()
    t.insertAll(['hello', 'world'])
    const suggestions = t.suggest('hello', 5, 2)
    expect(suggestions).toContain('hello')
    expect(suggestions[0]).toBe('hello') // exact match first
  })

  it('suggests for single character edits', () => {
    const t = new Trie()
    t.insertAll(['cat', 'bat', 'hat', 'mat', 'rat', 'sat'])
    const suggestions = t.suggest('fat', 10, 1)
    expect(suggestions).toContain('bat')
    expect(suggestions).toContain('hat')
    expect(suggestions).toContain('mat')
    expect(suggestions).toContain('rat')
    expect(suggestions).toContain('sat')
    expect(suggestions).toContain('cat')
  })

  it('suggests for transpositions', () => {
    const t = new Trie()
    t.insertAll(['test', 'best', 'rest'])
    const suggestions = t.suggest('tset', 5, 2)
    expect(suggestions).toContain('test')
  })

  it('suggests for missing character', () => {
    const t = new Trie()
    t.insertAll(['hello', 'world'])
    const suggestions = t.suggest('hllo', 5, 1)
    expect(suggestions).toContain('hello')
  })

  it('suggests for extra character', () => {
    const t = new Trie()
    t.insertAll(['hello', 'world'])
    const suggestions = t.suggest('helllo', 5, 1)
    expect(suggestions).toContain('hello')
  })

  it('returns empty suggestions when nothing is close', () => {
    const t = new Trie()
    t.insertAll(['cat', 'dog', 'fish'])
    const suggestions = t.suggest('zzzzzzzzz', 5, 2)
    expect(suggestions.length).toBe(0)
  })

  it('limits suggestion count', () => {
    const t = new Trie()
    for (let i = 0; i < 100; i++) t.insert(`word${String(i).padStart(3, '0')}`)
    const suggestions = t.suggest('word', 3, 3)
    expect(suggestions.length).toBeLessThanOrEqual(3)
  })

  // ─── Serialization ────────────────────────────────────────────

  it('round-trips through serialize/deserialize with large dataset', () => {
    const t = new Trie()
    const words = ['algorithm', 'binary', 'compiler', 'database', 'encryption',
      'framework', 'graphql', 'hashmap', 'iterator', 'javascript']
    t.insertAll(words)

    const restored = Trie.deserialize(t.serialize())
    for (const w of words) {
      expect(restored.has(w)).toBe(true)
    }
    expect(restored.size).toBe(words.length)
  })

  it('deserialize handles empty string', () => {
    const t = Trie.deserialize('')
    expect(t.size).toBe(0)
  })

  it('deserialize handles comments and blank lines', () => {
    const t = Trie.deserialize('hello\n\nworld\n\n')
    expect(t.has('hello')).toBe(true)
    expect(t.has('world')).toBe(true)
    expect(t.size).toBe(2)
  })

  // ─── Performance ──────────────────────────────────────────────

  it('handles 100K words without crashing', () => {
    const t = new Trie()
    for (let i = 0; i < 100_000; i++) t.insert(`w${i}`)
    expect(t.size).toBe(100_000)
    expect(t.has('w0')).toBe(true)
    expect(t.has('w99999')).toBe(true)
  })

  it('lookup is fast for large trie', () => {
    const t = new Trie()
    for (let i = 0; i < 50_000; i++) t.insert(`word${i}`)

    const start = performance.now()
    for (let i = 0; i < 10_000; i++) {
      t.has(`word${i}`)
    }
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(100) // 10K lookups in < 100ms
  })
})
