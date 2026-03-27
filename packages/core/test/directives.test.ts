import { describe, expect, it } from 'bun:test'
import { parseDirectives, isSuppressed } from '../src/directives'

describe('parseDirectives', () => {
  it('parses disable directive', () => {
    const directives = parseDirectives('// spell-check:disable\nhello\n')
    expect(directives.length).toBe(1)
    expect(directives[0].type).toBe('disable')
    expect(directives[0].line).toBe(1)
  })

  it('parses enable directive', () => {
    const directives = parseDirectives('// spell-check:enable\n')
    expect(directives[0].type).toBe('enable')
  })

  it('parses disable-next-line', () => {
    const directives = parseDirectives('// spell-check:disable-next-line\nhello\n')
    expect(directives[0].type).toBe('disable-next-line')
  })

  it('parses word directive with words', () => {
    const directives = parseDirectives('// spell-check:word foo bar baz\n')
    expect(directives[0].type).toBe('word')
    expect(directives[0].words).toEqual(['foo', 'bar', 'baz'])
  })

  it('parses ignore directive', () => {
    const directives = parseDirectives('// spell-check:ignore myWord\n')
    expect(directives[0].type).toBe('ignore')
    expect(directives[0].words).toEqual(['myWord'])
  })

  it('parses cspell compatibility format', () => {
    const directives = parseDirectives('// cspell:disable\n')
    expect(directives[0].type).toBe('disable')
  })

  it('parses cspell words format', () => {
    const directives = parseDirectives('// cspell:words foo, bar\n')
    expect(directives[0].type).toBe('word')
    expect(directives[0].words).toContain('foo')
    expect(directives[0].words).toContain('bar')
  })

  it('parses hash comment style', () => {
    const directives = parseDirectives('# spell-check:disable\n')
    expect(directives[0].type).toBe('disable')
  })

  it('returns empty for no directives', () => {
    expect(parseDirectives('hello world\n')).toEqual([])
  })
})

describe('isSuppressed', () => {
  it('suppresses in disabled region', () => {
    const directives = parseDirectives('// spell-check:disable\nhello\n')
    expect(isSuppressed('hello', 2, directives, new Set())).toBe(true)
  })

  it('re-enables after enable', () => {
    const directives = parseDirectives('// spell-check:disable\nhello\n// spell-check:enable\nworld\n')
    expect(isSuppressed('hello', 2, directives, new Set())).toBe(true)
    expect(isSuppressed('world', 4, directives, new Set())).toBe(false)
  })

  it('suppresses next line only', () => {
    const directives = parseDirectives('// spell-check:disable-next-line\nhello\nworld\n')
    expect(isSuppressed('hello', 2, directives, new Set())).toBe(true)
    expect(isSuppressed('world', 3, directives, new Set())).toBe(false)
  })

  it('suppresses ignore words', () => {
    const directives = parseDirectives('// spell-check:ignore myWord\nhello myWord\n')
    expect(isSuppressed('myWord', 2, directives, new Set())).toBe(true)
    expect(isSuppressed('hello', 2, directives, new Set())).toBe(false)
  })

  it('suppresses from ignoreWords set', () => {
    const ignoreWords = new Set(['ignored'])
    expect(isSuppressed('ignored', 1, [], ignoreWords)).toBe(true)
    expect(isSuppressed('other', 1, [], ignoreWords)).toBe(false)
  })
})
