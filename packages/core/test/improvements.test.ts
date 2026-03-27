import { describe, expect, it } from 'bun:test'
import { SpellChecker, COMMON_MISSPELLINGS, HIGH_FREQUENCY_WORDS, createDictionary } from '../src/index'

describe('Common misspelling corrections', () => {
  it('suggests "definitely" for "definately"', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('This is definately wrong')
    const issue = result.issues.find(i => i.word === 'definately')
    expect(issue).toBeDefined()
    expect(issue!.suggestions[0]).toBe('definitely')
  })

  it('suggests "receive" for "recieve"', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('Please recieve this')
    const issue = result.issues.find(i => i.word === 'recieve')
    expect(issue).toBeDefined()
    expect(issue!.suggestions[0]).toBe('receive')
  })

  it('suggests "separate" for "seperate"', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('Keep them seperate')
    const issue = result.issues.find(i => i.word === 'seperate')
    expect(issue).toBeDefined()
    expect(issue!.suggestions[0]).toBe('separate')
  })

  it('suggests "quick" for "quik"', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('A quik test')
    const issue = result.issues.find(i => i.word === 'quik')
    expect(issue).toBeDefined()
    expect(issue!.suggestions[0]).toBe('quick')
  })

  it('suggests "environment" for "enviroment"', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('Set the enviroment variable')
    const issue = result.issues.find(i => i.word === 'enviroment')
    expect(issue).toBeDefined()
    expect(issue!.suggestions[0]).toBe('environment')
  })

  it('handles programming misspellings', async () => {
    const checker = await SpellChecker.create()
    const r1 = checker.checkText('The asyncronous function')
    const a1 = r1.issues.find(i => i.word === 'asyncronous')
    expect(a1?.suggestions[0]).toBe('asynchronous')

    const r2 = checker.checkText('The middlewear handles it')
    const a2 = r2.issues.find(i => i.word === 'middlewear')
    expect(a2?.suggestions[0]).toBe('middleware')
  })

  it('COMMON_MISSPELLINGS has 100+ entries', () => {
    expect(COMMON_MISSPELLINGS.size).toBeGreaterThan(100)
  })
})

describe('Frequency-weighted suggestions', () => {
  it('HIGH_FREQUENCY_WORDS contains common words', () => {
    expect(HIGH_FREQUENCY_WORDS.has('the')).toBe(true)
    expect(HIGH_FREQUENCY_WORDS.has('function')).toBe(true)
    expect(HIGH_FREQUENCY_WORDS.has('return')).toBe(true)
    expect(HIGH_FREQUENCY_WORDS.has('quick')).toBe(true)
  })

  it('prefers high-frequency words in suggestions', () => {
    const dict = createDictionary(['test', 'text', 'tent', 'rest', 'best', 'nest'])
    const suggestions = dict.suggest('tset')
    // 'test' should appear (it's a high-frequency word)
    expect(suggestions).toContain('test')
  })
})

describe('Batch checkFiles API', () => {
  it('checks multiple files and returns only those with issues', async () => {
    const checker = await SpellChecker.create()

    // Create test files
    await Bun.write('/tmp/spell-test-a.md', 'Correct English text here\n')
    await Bun.write('/tmp/spell-test-b.md', 'This has a definately wrong word\n')
    await Bun.write('/tmp/spell-test-c.md', 'Another recieve misspelling\n')

    const results = await checker.checkFiles([
      '/tmp/spell-test-a.md',
      '/tmp/spell-test-b.md',
      '/tmp/spell-test-c.md',
    ])

    // File a has no issues, files b and c do
    expect(results.length).toBe(2)

    const uris = results.map(r => r.uri)
    expect(uris).toContain('/tmp/spell-test-b.md')
    expect(uris).toContain('/tmp/spell-test-c.md')
    expect(uris).not.toContain('/tmp/spell-test-a.md')

    // Cleanup
    const fs = await import('node:fs/promises')
    await fs.unlink('/tmp/spell-test-a.md').catch(() => {})
    await fs.unlink('/tmp/spell-test-b.md').catch(() => {})
    await fs.unlink('/tmp/spell-test-c.md').catch(() => {})
  })

  it('handles non-existent files gracefully', async () => {
    const checker = await SpellChecker.create()
    const results = await checker.checkFiles(['/tmp/nonexistent-spell-file.xyz'])
    expect(results.length).toBe(0) // Should not crash
  })

  it('respects concurrency parameter', async () => {
    const checker = await SpellChecker.create()
    await Bun.write('/tmp/spell-conc.md', 'This is correct\n')
    const results = await checker.checkFiles(['/tmp/spell-conc.md'], 1)
    expect(results.length).toBe(0)
    const fs = await import('node:fs/promises')
    await fs.unlink('/tmp/spell-conc.md').catch(() => {})
  })
})
