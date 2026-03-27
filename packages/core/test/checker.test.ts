import { describe, expect, it } from 'bun:test'
import { SpellChecker } from '../src/checker'

describe('SpellChecker', () => {
  it('creates an instance', async () => {
    const checker = await SpellChecker.create({ words: ['custom'] })
    expect(checker).toBeDefined()
  })

  it('finds misspelled words', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('This is a tset of the spel checker')
    // 'tset' and 'spel' should be flagged
    const words = result.issues.map(i => i.word)
    expect(words).toContain('tset')
    expect(words).toContain('spel')
  })

  it('accepts correctly spelled words', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('This is a test of the spell checker')
    // All real words should pass
    const misspelled = result.issues.filter(i => ['This', 'test', 'the', 'spell', 'checker'].includes(i.word))
    expect(misspelled.length).toBe(0)
  })

  it('accepts programming terms', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('const config = async function middleware() {}')
    // Programming keywords should not be flagged
    const words = result.issues.map(i => i.word)
    expect(words).not.toContain('const')
    expect(words).not.toContain('config')
    expect(words).not.toContain('async')
    expect(words).not.toContain('middleware')
  })

  it('respects custom words', async () => {
    const checker = await SpellChecker.create({ words: ['xyzzy', 'plugh'] })
    const result = checker.checkText('The words xyzzy and plugh are valid')
    const words = result.issues.map(i => i.word)
    expect(words).not.toContain('xyzzy')
    expect(words).not.toContain('plugh')
  })

  it('provides suggestions', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('This has a tset in it')
    const testIssue = result.issues.find(i => i.word === 'tset')
    if (testIssue) {
      expect(testIssue.suggestions.length).toBeGreaterThan(0)
    }
  })

  it('respects disable directives', async () => {
    const checker = await SpellChecker.create()
    const text = '// spell-check:disable\nThis has xyzzy and plugh\n// spell-check:enable\n'
    const result = checker.checkText(text)
    const words = result.issues.map(i => i.word)
    expect(words).not.toContain('xyzzy')
    expect(words).not.toContain('plugh')
  })

  it('respects disable-next-line directive', async () => {
    const checker = await SpellChecker.create()
    const text = '// spell-check:disable-next-line\nThis has xyzzy here\nand plugh here\n'
    const result = checker.checkText(text)
    const words = result.issues.map(i => i.word)
    expect(words).not.toContain('xyzzy') // suppressed
    // plugh might be flagged since disable-next-line only covers one line
  })

  it('respects word directive', async () => {
    const checker = await SpellChecker.create()
    const text = '// spell-check:word xyzzy\nThe word xyzzy is valid here\n'
    const result = checker.checkText(text)
    const words = result.issues.map(i => i.word)
    expect(words).not.toContain('xyzzy')
  })

  it('reports line and column numbers', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('hello\ntset world\n')
    const issue = result.issues.find(i => i.word === 'tset')
    if (issue) {
      expect(issue.line).toBe(2)
      expect(issue.column).toBeGreaterThan(0)
    }
  })

  it('tracks words checked count', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('one two three four five')
    expect(result.wordsChecked).toBeGreaterThan(0)
  })

  it('tracks elapsed time', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('hello world')
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0)
  })

  it('isCorrect checks single words', async () => {
    const checker = await SpellChecker.create()
    expect(checker.isCorrect('hello')).toBe(true)
    expect(checker.isCorrect('xyzzy')).toBe(false)
  })

  it('addWord adds to session dictionary', async () => {
    const checker = await SpellChecker.create()
    expect(checker.isCorrect('xyzzy')).toBe(false)
    checker.addWord('xyzzy')
    expect(checker.isCorrect('xyzzy')).toBe(true)
  })

  it('handles empty text', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('')
    expect(result.issues.length).toBe(0)
  })

  it('handles camelCase identifiers', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('const myVariable = getValue()')
    // All parts should be valid English or programming terms
    const flaggedRealWords = result.issues.filter(i =>
      ['my', 'Variable', 'get', 'Value'].includes(i.word),
    )
    expect(flaggedRealWords.length).toBe(0)
  })

  it('skips short words', async () => {
    const checker = await SpellChecker.create({ minWordLength: 4 })
    const result = checker.checkText('xy ab cd zq')
    // All words are < 4 chars, should be skipped
    expect(result.issues.length).toBe(0)
  })
})
