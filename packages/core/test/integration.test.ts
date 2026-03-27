import { describe, expect, it } from 'bun:test'
import { SpellChecker, createDictionary, extractWords, splitIdentifier, parseDirectives, Trie, loadConfig, DEFAULT_CONFIG } from '../src/index'

describe('Integration — full pipeline', () => {
  it('exports all public APIs', () => {
    expect(SpellChecker).toBeDefined()
    expect(createDictionary).toBeDefined()
    expect(extractWords).toBeDefined()
    expect(splitIdentifier).toBeDefined()
    expect(parseDirectives).toBeDefined()
    expect(Trie).toBeDefined()
    expect(loadConfig).toBeDefined()
    expect(DEFAULT_CONFIG).toBeDefined()
  })

  it('full pipeline: split -> extract -> check', async () => {
    // 1. Split an identifier
    const parts = splitIdentifier('myMisspelledVariabel')
    expect(parts.map(p => p.word)).toEqual(['my', 'Misspelled', 'Variabel'])

    // 2. Extract words from a line
    const words = extractWords('const myMisspelledVariabel = true')
    expect(words.length).toBeGreaterThan(0)

    // 3. Check with the spell checker
    const checker = await SpellChecker.create()
    const result = checker.checkText('const myMisspelledVariabel = true')
    // "Variabel" should be flagged (common misspelling of "Variable")
    const flagged = result.issues.map(i => i.word)
    expect(flagged).toContain('Variabel')
  })

  it('full pipeline: config -> dictionary -> check', async () => {
    // Custom config with extra words
    const checker = await SpellChecker.create({
      words: ['kubectl', 'nginx', 'redis'],
      flagWords: ['todo'],
      ignoreWords: ['fixme'],
      minWordLength: 3,
      maxSuggestions: 3,
    })

    const text = `
// TODO: deploy kubectl to nginx with redis
// FIXME: this needs work
const serverConfig = getRedisConnection()
`
    const result = checker.checkText(text)

    // 'kubectl', 'nginx', 'redis' should NOT be flagged (custom words)
    const flaggedWords = result.issues.map(i => i.word.toLowerCase())
    expect(flaggedWords).not.toContain('kubectl')
    expect(flaggedWords).not.toContain('nginx')
    expect(flaggedWords).not.toContain('redis')

    // 'fixme' should NOT be flagged (ignore word)
    expect(flaggedWords).not.toContain('fixme')
  })

  it('custom dictionary works with checker', async () => {
    const customDict = createDictionary(['supercustomword', 'anotherspecialterm'])
    const checker = await SpellChecker.create({
      dictionaries: [customDict],
    })

    const result = checker.checkText('The supercustomword and anotherspecialterm are valid')
    const flagged = result.issues.map(i => i.word)
    expect(flagged).not.toContain('supercustomword')
    expect(flagged).not.toContain('anotherspecialterm')
  })

  it('trie roundtrip preserves dictionary correctness', () => {
    const trie = new Trie()
    const words = ['hello', 'world', 'typescript', 'javascript', 'spell', 'check']
    trie.insertAll(words)

    const serialized = trie.serialize()
    const restored = Trie.deserialize(serialized)

    for (const w of words) {
      expect(restored.has(w)).toBe(true)
    }
    expect(restored.has('missing')).toBe(false)
  })

  it('DEFAULT_CONFIG has sensible values', () => {
    expect(DEFAULT_CONFIG.language).toBe('en')
    expect(DEFAULT_CONFIG.minWordLength).toBe(3)
    expect(DEFAULT_CONFIG.maxSuggestions).toBe(5)
    expect(DEFAULT_CONFIG.allowCompoundWords).toBe(true)
    expect(DEFAULT_CONFIG.files!.length).toBeGreaterThan(0)
    expect(DEFAULT_CONFIG.ignorePaths!.length).toBeGreaterThan(0)
    expect(DEFAULT_CONFIG.ignoreRegExps!.length).toBeGreaterThan(0)
  })

  it('handles real-world React component', async () => {
    const checker = await SpellChecker.create()
    const code = `
import { useState, useEffect } from 'react'

interface UserProfileProps {
  userId: string
  onUpdate: (user: User) => void
}

export function UserProfile({ userId, onUpdate }: UserProfileProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUser(userId).then(onUpdate).catch(setError)
  }, [userId])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return <div className="user-profile">Profile loaded</div>
}
`
    const result = checker.checkText(code)
    // Should not flag standard React/TS patterns
    const flagged = result.issues.map(i => i.word.toLowerCase())
    expect(flagged).not.toContain('usestate')
    expect(flagged).not.toContain('useeffect')
    expect(flagged).not.toContain('loading')
    expect(flagged).not.toContain('profile')
    expect(flagged).not.toContain('interface')
  })

  it('handles real-world package.json content', async () => {
    const checker = await SpellChecker.create()
    const json = `{
  "name": "my-awesome-package",
  "description": "A comprehensive utility library for TypeScript developers",
  "version": "1.0.0",
  "keywords": ["typescript", "utilities", "helpers"],
  "license": "MIT"
}`
    const result = checker.checkText(json)
    const flagged = result.issues.map(i => i.word.toLowerCase())
    expect(flagged).not.toContain('comprehensive')
    expect(flagged).not.toContain('utility')
    expect(flagged).not.toContain('library')
    // 'developers' is an inflected form — check it's in the dict now
    expect(flagged).not.toContain('package')
  })
})
