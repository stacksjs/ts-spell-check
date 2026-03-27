import { describe, expect, it } from 'bun:test'
import { splitIdentifier, extractWords } from '../src/splitter'

describe('splitIdentifier', () => {
  it('splits camelCase', () => {
    const parts = splitIdentifier('camelCase')
    expect(parts.map(p => p.word)).toEqual(['camel', 'Case'])
  })

  it('splits PascalCase', () => {
    const parts = splitIdentifier('PascalCase')
    expect(parts.map(p => p.word)).toEqual(['Pascal', 'Case'])
  })

  it('splits snake_case', () => {
    const parts = splitIdentifier('snake_case')
    expect(parts.map(p => p.word)).toEqual(['snake', 'case'])
  })

  it('splits kebab-case', () => {
    const parts = splitIdentifier('kebab-case')
    expect(parts.map(p => p.word)).toEqual(['kebab', 'case'])
  })

  it('splits SCREAMING_SNAKE_CASE', () => {
    const parts = splitIdentifier('SCREAMING_SNAKE_CASE')
    expect(parts.map(p => p.word)).toEqual(['SCREAMING', 'SNAKE', 'CASE'])
  })

  it('splits acronyms correctly', () => {
    const parts = splitIdentifier('HTTPServer')
    expect(parts.map(p => p.word)).toEqual(['HTTP', 'Server'])
  })

  it('handles XMLHttpRequest', () => {
    const parts = splitIdentifier('XMLHttpRequest')
    expect(parts.map(p => p.word)).toEqual(['XML', 'Http', 'Request'])
  })

  it('handles getHTTPSUrl', () => {
    const parts = splitIdentifier('getHTTPSUrl')
    expect(parts.map(p => p.word)).toEqual(['get', 'HTTPS', 'Url'])
  })

  it('splits numbers from words', () => {
    const parts = splitIdentifier('value2string')
    expect(parts.map(p => p.word)).toEqual(['value', '2', 'string'])
  })

  it('handles single words', () => {
    const parts = splitIdentifier('hello')
    expect(parts.map(p => p.word)).toEqual(['hello'])
  })

  it('handles all caps', () => {
    const parts = splitIdentifier('HTTP')
    expect(parts.map(p => p.word)).toEqual(['HTTP'])
  })

  it('tracks offsets correctly', () => {
    const parts = splitIdentifier('camelCase')
    expect(parts[0].offset).toBe(0) // 'camel' at 0
    expect(parts[1].offset).toBe(5) // 'Case' at 5
  })

  it('handles empty string', () => {
    expect(splitIdentifier('')).toEqual([])
  })

  it('handles dot-separated paths', () => {
    const parts = splitIdentifier('path.to.value')
    expect(parts.map(p => p.word)).toEqual(['path', 'to', 'value'])
  })
})

describe('extractWords', () => {
  it('extracts words from a line of code', () => {
    const words = extractWords('const myVariable = "hello world"')
    const texts = words.map(w => w.word)
    expect(texts).toContain('const')
    expect(texts).toContain('my')
    expect(texts).toContain('Variable')
    expect(texts).toContain('hello')
    expect(texts).toContain('world')
  })

  it('skips hex-like tokens', () => {
    const words = extractWords('const color = "#ff00ff"')
    const texts = words.map(w => w.word)
    expect(texts).not.toContain('ff00ff')
  })

  it('extracts words from comments', () => {
    const words = extractWords('// This is a comment with a misspeling')
    const texts = words.map(w => w.word)
    expect(texts).toContain('This')
    expect(texts).toContain('comment')
    expect(texts).toContain('misspeling')
  })

  it('handles empty string', () => {
    expect(extractWords('')).toEqual([])
  })

  it('tracks positions correctly', () => {
    const words = extractWords('hello world')
    expect(words[0].word).toBe('hello')
    expect(words[0].offset).toBe(0)
    expect(words[1].word).toBe('world')
    expect(words[1].offset).toBe(6)
  })
})
