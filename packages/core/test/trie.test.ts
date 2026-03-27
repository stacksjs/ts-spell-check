import { describe, expect, it } from 'bun:test'
import { Trie } from '../src/trie'

describe('Trie', () => {
  it('inserts and finds words', () => {
    const trie = new Trie()
    trie.insert('hello')
    trie.insert('world')
    expect(trie.has('hello')).toBe(true)
    expect(trie.has('world')).toBe(true)
    expect(trie.has('missing')).toBe(false)
  })

  it('is case-insensitive', () => {
    const trie = new Trie()
    trie.insert('Hello')
    expect(trie.has('hello')).toBe(true)
    expect(trie.has('HELLO')).toBe(true)
    expect(trie.has('Hello')).toBe(true)
  })

  it('tracks size correctly', () => {
    const trie = new Trie()
    expect(trie.size).toBe(0)
    trie.insert('one')
    expect(trie.size).toBe(1)
    trie.insert('two')
    expect(trie.size).toBe(2)
    trie.insert('one') // duplicate
    expect(trie.size).toBe(2)
  })

  it('checks prefixes', () => {
    const trie = new Trie()
    trie.insert('testing')
    expect(trie.hasPrefix('test')).toBe(true)
    expect(trie.hasPrefix('testing')).toBe(true)
    expect(trie.hasPrefix('xyz')).toBe(false)
  })

  it('gets words with prefix', () => {
    const trie = new Trie()
    trie.insert('test')
    trie.insert('testing')
    trie.insert('tested')
    trie.insert('tester')
    trie.insert('other')

    const results = trie.getWordsWithPrefix('test')
    expect(results.length).toBe(4)
    expect(results).toContain('test')
    expect(results).toContain('testing')
  })

  it('suggests similar words', () => {
    const trie = new Trie()
    trie.insertAll(['hello', 'help', 'held', 'world', 'word', 'work'])

    const suggestions = trie.suggest('helo', 3)
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions).toContain('hello')
  })

  it('serializes and deserializes', () => {
    const trie = new Trie()
    trie.insertAll(['alpha', 'beta', 'gamma'])

    const serialized = trie.serialize()
    const restored = Trie.deserialize(serialized)

    expect(restored.has('alpha')).toBe(true)
    expect(restored.has('beta')).toBe(true)
    expect(restored.has('gamma')).toBe(true)
    expect(restored.has('delta')).toBe(false)
    expect(restored.size).toBe(3)
  })

  it('handles empty words gracefully', () => {
    const trie = new Trie()
    trie.insert('')
    expect(trie.size).toBe(0)
    expect(trie.has('')).toBe(false)
  })

  it('handles large word lists', () => {
    const trie = new Trie()
    const words = Array.from({ length: 10000 }, (_, i) => `word${i}`)
    trie.insertAll(words)
    expect(trie.size).toBe(10000)
    expect(trie.has('word0')).toBe(true)
    expect(trie.has('word9999')).toBe(true)
    expect(trie.has('word10000')).toBe(false)
  })
})
