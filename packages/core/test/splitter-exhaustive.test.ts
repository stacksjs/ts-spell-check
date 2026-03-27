import { describe, expect, it } from 'bun:test'
import { splitIdentifier, extractWords } from '../src/splitter'

describe('splitIdentifier — exhaustive', () => {
  // ─── Standard naming conventions ──────────────────────────────

  it('splits simple camelCase', () => {
    expect(splitIdentifier('firstName').map(p => p.word)).toEqual(['first', 'Name'])
  })

  it('splits deep camelCase', () => {
    expect(splitIdentifier('myVeryLongVariableName').map(p => p.word))
      .toEqual(['my', 'Very', 'Long', 'Variable', 'Name'])
  })

  it('splits PascalCase', () => {
    expect(splitIdentifier('MyComponent').map(p => p.word)).toEqual(['My', 'Component'])
  })

  it('splits snake_case', () => {
    expect(splitIdentifier('my_variable').map(p => p.word)).toEqual(['my', 'variable'])
  })

  it('splits SCREAMING_SNAKE', () => {
    expect(splitIdentifier('MAX_RETRY_COUNT').map(p => p.word)).toEqual(['MAX', 'RETRY', 'COUNT'])
  })

  it('splits kebab-case', () => {
    expect(splitIdentifier('my-component').map(p => p.word)).toEqual(['my', 'component'])
  })

  it('splits dot.notation', () => {
    expect(splitIdentifier('module.exports').map(p => p.word)).toEqual(['module', 'exports'])
  })

  it('splits slash/paths', () => {
    expect(splitIdentifier('src/utils').map(p => p.word)).toEqual(['src', 'utils'])
  })

  // ─── Acronym handling ─────────────────────────────────────────

  it('handles HTTP prefix', () => {
    expect(splitIdentifier('HTTPServer').map(p => p.word)).toEqual(['HTTP', 'Server'])
  })

  it('handles HTTP suffix', () => {
    expect(splitIdentifier('serverHTTP').map(p => p.word)).toEqual(['server', 'HTTP'])
  })

  it('handles HTTPS in middle', () => {
    expect(splitIdentifier('getHTTPSResponse').map(p => p.word)).toEqual(['get', 'HTTPS', 'Response'])
  })

  it('handles XMLHttpRequest pattern', () => {
    expect(splitIdentifier('XMLHttpRequest').map(p => p.word)).toEqual(['XML', 'Http', 'Request'])
  })

  it('handles consecutive acronyms', () => {
    expect(splitIdentifier('TCPIPConnection').map(p => p.word)).toEqual(['TCPIP', 'Connection'])
  })

  it('handles single letter followed by caps', () => {
    expect(splitIdentifier('iOS').map(p => p.word)).toEqual(['i', 'OS'])
  })

  // ─── Number handling ──────────────────────────────────────────

  it('splits numbers from letters', () => {
    expect(splitIdentifier('utf8Encode').map(p => p.word)).toEqual(['utf', '8', 'Encode'])
  })

  it('handles pure numbers', () => {
    expect(splitIdentifier('404').map(p => p.word)).toEqual(['404'])
  })

  it('handles version strings', () => {
    expect(splitIdentifier('v2beta').map(p => p.word)).toEqual(['v', '2', 'beta'])
  })

  // ─── Edge cases ───────────────────────────────────────────────

  it('handles single word', () => {
    expect(splitIdentifier('hello').map(p => p.word)).toEqual(['hello'])
  })

  it('handles single uppercase word', () => {
    expect(splitIdentifier('CONSTANT').map(p => p.word)).toEqual(['CONSTANT'])
  })

  it('handles single char', () => {
    expect(splitIdentifier('x').map(p => p.word)).toEqual(['x'])
  })

  it('handles empty string', () => {
    expect(splitIdentifier('')).toEqual([])
  })

  it('handles underscores at start and end', () => {
    expect(splitIdentifier('_private_').map(p => p.word)).toEqual(['private'])
  })

  it('handles double underscores', () => {
    expect(splitIdentifier('__dunder__').map(p => p.word)).toEqual(['dunder'])
  })

  it('handles mixed separators', () => {
    expect(splitIdentifier('my_var-name.path').map(p => p.word)).toEqual(['my', 'var', 'name', 'path'])
  })

  // ─── Offset tracking ─────────────────────────────────────────

  it('tracks offsets in camelCase', () => {
    const parts = splitIdentifier('firstName')
    expect(parts[0]).toEqual({ word: 'first', offset: 0 })
    expect(parts[1]).toEqual({ word: 'Name', offset: 5 })
  })

  it('tracks offsets with separators', () => {
    const parts = splitIdentifier('hello_world')
    expect(parts[0]).toEqual({ word: 'hello', offset: 0 })
    expect(parts[1]).toEqual({ word: 'world', offset: 6 })
  })

  it('tracks offsets with multiple separators', () => {
    const parts = splitIdentifier('a__b')
    expect(parts[0]).toEqual({ word: 'a', offset: 0 })
    expect(parts[1]).toEqual({ word: 'b', offset: 3 })
  })
})

describe('extractWords — exhaustive', () => {
  // ─── Code patterns ────────────────────────────────────────────

  it('extracts from TypeScript declaration', () => {
    const words = extractWords('export const myConfig: ConfigType = {}').map(w => w.word)
    expect(words).toContain('export')
    expect(words).toContain('my')
    expect(words).toContain('Config')
  })

  it('extracts from function definition', () => {
    const words = extractWords('async function fetchUserData(userId: string) {').map(w => w.word)
    expect(words).toContain('async')
    expect(words).toContain('fetch')
    expect(words).toContain('User')
    expect(words).toContain('Data')
  })

  it('extracts from import statement', () => {
    const words = extractWords("import { readFile } from 'node:fs'").map(w => w.word)
    expect(words).toContain('import')
    expect(words).toContain('read')
    expect(words).toContain('File')
  })

  it('extracts from JSX/HTML', () => {
    const words = extractWords('<MyComponent className="header-title" />').map(w => w.word)
    expect(words).toContain('My')
    expect(words).toContain('Component')
    expect(words).toContain('class')
  })

  it('extracts from shell script', () => {
    const words = extractWords('#!/bin/bash\necho "hello world"').map(w => w.word)
    expect(words).toContain('bin')
    expect(words).toContain('bash')
    expect(words).toContain('echo')
    expect(words).toContain('hello')
  })

  it('extracts from markdown', () => {
    const words = extractWords('# Getting Started\nThis is a **bold** statement.').map(w => w.word)
    expect(words).toContain('Getting')
    expect(words).toContain('Started')
    expect(words).toContain('bold')
    expect(words).toContain('statement')
  })

  // ─── Filtering ────────────────────────────────────────────────

  it('skips hex color codes', () => {
    const words = extractWords('color: #ff00ff').map(w => w.word)
    expect(words).not.toContain('ff00ff')
  })

  it('skips long hex strings', () => {
    const words = extractWords('sha = "abc123def456"').map(w => w.word)
    expect(words).not.toContain('abc123def456')
  })

  it('skips single characters', () => {
    const words = extractWords('a = b + c').map(w => w.word)
    // Single chars should not appear
    for (const w of words) {
      expect(w.length).toBeGreaterThanOrEqual(2)
    }
  })

  // ─── Position tracking ────────────────────────────────────────

  it('tracks positions in multi-word line', () => {
    const words = extractWords('hello beautiful world')
    expect(words[0]).toEqual({ word: 'hello', offset: 0 })
    expect(words[1]).toEqual({ word: 'beautiful', offset: 6 })
    expect(words[2]).toEqual({ word: 'world', offset: 16 })
  })

  it('handles empty input', () => {
    expect(extractWords('')).toEqual([])
  })

  it('handles line with only punctuation', () => {
    expect(extractWords('!@#$%^&*()')).toEqual([])
  })

  it('handles line with only numbers', () => {
    const words = extractWords('12345 67890')
    expect(words.length).toBe(0) // pure numbers filtered
  })

  // ─── Contractions and possessives ─────────────────────────────

  it('handles contractions by extracting word parts', () => {
    // The word regex matches sequences including apostrophes
    const words = extractWords("don't can't won't").map(w => w.word)
    // Contractions may be split at apostrophe or kept whole depending on regex
    const allText = words.join(' ').toLowerCase()
    expect(allText).toContain('don')
    expect(allText).toContain('can')
    expect(allText).toContain('won')
  })

  it('handles possessives', () => {
    const words = extractWords("user's config").map(w => w.word)
    const allText = words.join(' ').toLowerCase()
    expect(allText).toContain('user')
  })
})
