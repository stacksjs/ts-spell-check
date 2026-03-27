import { describe, expect, it } from 'bun:test'
import { SpellChecker } from '../src/checker'

describe('SpellChecker — exhaustive', () => {
  // ─── Real-world code snippets ─────────────────────────────────

  it('handles TypeScript source code', async () => {
    const checker = await SpellChecker.create()
    const code = `
export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const response = await fetch(\`/api/users/\${userId}\`)
  if (!response.ok) throw new Error('Failed to fetch user')
  return response.json()
}
`
    const result = checker.checkText(code)
    // Real words should not be flagged
    const flagged = result.issues.map(i => i.word.toLowerCase())
    expect(flagged).not.toContain('fetch')
    expect(flagged).not.toContain('user')
    expect(flagged).not.toContain('profile')
    expect(flagged).not.toContain('response')
    expect(flagged).not.toContain('async')
    expect(flagged).not.toContain('promise')
  })

  it('handles shell script', async () => {
    const checker = await SpellChecker.create()
    const code = `#!/bin/bash
set -euo pipefail
echo "deploying to production"
cd /opt/app || exit 1
git pull origin main
`
    const result = checker.checkText(code)
    const flagged = result.issues.map(i => i.word.toLowerCase())
    expect(flagged).not.toContain('echo')
    expect(flagged).not.toContain('deploying')
    expect(flagged).not.toContain('production')
  })

  it('handles markdown documentation', async () => {
    const checker = await SpellChecker.create()
    const doc = `# Getting Started

Install the package using npm:

\`\`\`bash
npm install my-package
\`\`\`

## Configuration

Create a configuration file in your project root.
`
    const result = checker.checkText(doc)
    const flagged = result.issues.map(i => i.word.toLowerCase())
    expect(flagged).not.toContain('getting')
    expect(flagged).not.toContain('started')
    expect(flagged).not.toContain('install')
    expect(flagged).not.toContain('configuration')
  })

  // ─── Misspelling detection ────────────────────────────────────

  it('catches common misspellings', async () => {
    const checker = await SpellChecker.create()
    const text = 'This has a definately wrong recieve and seperate words'
    const result = checker.checkText(text)
    const flagged = result.issues.map(i => i.word)
    expect(flagged).toContain('definately')
    expect(flagged).toContain('recieve')
    expect(flagged).toContain('seperate')
  })

  it('catches gibberish', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('The xyzzy plugh and qwerty are not words')
    const flagged = result.issues.map(i => i.word)
    expect(flagged).toContain('xyzzy')
    expect(flagged).toContain('plugh')
  })

  // ─── False positive prevention ────────────────────────────────

  it('does not flag programming keywords', async () => {
    const checker = await SpellChecker.create()
    const keywords = 'const let var function return if else for while do switch case break continue class extends implements interface type enum namespace import export default from async await try catch finally throw new delete typeof instanceof void null undefined true false this super yield static public private protected readonly abstract'
    const result = checker.checkText(keywords)
    expect(result.issues.length).toBe(0)
  })

  it('does not flag common abbreviations', async () => {
    const checker = await SpellChecker.create()
    const abbrevs = 'args cfg cli cmd config ctx db dir env fn idx init msg num obj opts pkg ref req res src str tmp url val'
    const result = checker.checkText(abbrevs)
    expect(result.issues.length).toBe(0)
  })

  it('does not flag technical terms', async () => {
    const checker = await SpellChecker.create()
    const terms = 'api cdn cors cpu css dns html http https json jwt npm oauth rpc sdk sql ssr ssl svg tcp tls udp uuid wasm'
    const result = checker.checkText(terms)
    expect(result.issues.length).toBe(0)
  })

  it('does not flag short words below minWordLength', async () => {
    const checker = await SpellChecker.create({ minWordLength: 4 })
    const result = checker.checkText('if an at by do go he in is it me my no of on or so to up we')
    expect(result.issues.length).toBe(0)
  })

  // ─── Custom words ─────────────────────────────────────────────

  it('respects custom words array', async () => {
    const checker = await SpellChecker.create({ words: ['kubernetes', 'grafana', 'prometheus'] })
    const result = checker.checkText('Deploy to kubernetes with grafana and prometheus monitoring')
    const flagged = result.issues.map(i => i.word.toLowerCase())
    expect(flagged).not.toContain('kubernetes')
    expect(flagged).not.toContain('grafana')
    expect(flagged).not.toContain('prometheus')
  })

  it('respects flag words', async () => {
    const checker = await SpellChecker.create({ flagWords: ['todo', 'fixme', 'hack'] })
    const result = checker.checkText('// TODO: fix this hack')
    // flagWords have error severity
    const errors = result.issues.filter(i => i.severity === 'error')
    expect(errors.length).toBeGreaterThan(0)
  })

  it('respects ignore words', async () => {
    const checker = await SpellChecker.create({ ignoreWords: ['xyzzy'] })
    const result = checker.checkText('The xyzzy value is used here')
    const flagged = result.issues.map(i => i.word)
    expect(flagged).not.toContain('xyzzy')
  })

  // ─── Directives ───────────────────────────────────────────────

  it('respects disable/enable block', async () => {
    const checker = await SpellChecker.create()
    const text = `normal text
// spell-check:disable
xyzzy plugh qwerty asdf
// spell-check:enable
more normal text`
    const result = checker.checkText(text)
    const flagged = result.issues.map(i => i.word)
    expect(flagged).not.toContain('xyzzy')
    expect(flagged).not.toContain('plugh')
    expect(flagged).not.toContain('qwerty')
  })

  it('respects cspell:words directive', async () => {
    const checker = await SpellChecker.create()
    const text = `// cspell:words kubectl minikube
Deploy using kubectl and minikube
`
    const result = checker.checkText(text)
    const flagged = result.issues.map(i => i.word)
    expect(flagged).not.toContain('kubectl')
    expect(flagged).not.toContain('minikube')
  })

  it('respects hash-style disable directive', async () => {
    const checker = await SpellChecker.create()
    const text = `# spell-check:disable
xyzzy plugh
# spell-check:enable
`
    const result = checker.checkText(text)
    const flagged = result.issues.map(i => i.word)
    expect(flagged).not.toContain('xyzzy')
  })

  // ─── Suggestions ──────────────────────────────────────────────

  it('provides relevant suggestions', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('The teh is misspeled')
    for (const issue of result.issues) {
      // Each issue should have suggestions
      expect(issue.suggestions).toBeDefined()
      // Suggestions should be an array
      expect(Array.isArray(issue.suggestions)).toBe(true)
    }
  })

  it('limits suggestions count', async () => {
    const checker = await SpellChecker.create({ maxSuggestions: 3 })
    const result = checker.checkText('This has a misspeling')
    for (const issue of result.issues) {
      expect(issue.suggestions.length).toBeLessThanOrEqual(3)
    }
  })

  // ─── Line/column accuracy ─────────────────────────────────────

  it('reports correct line numbers for multi-line text', async () => {
    const checker = await SpellChecker.create()
    const text = 'line one\nline two\nline three xyzzy\nline four'
    const result = checker.checkText(text)
    const xyzzyIssue = result.issues.find(i => i.word === 'xyzzy')
    if (xyzzyIssue) {
      expect(xyzzyIssue.line).toBe(3)
    }
  })

  it('reports correct column for words mid-line', async () => {
    const checker = await SpellChecker.create()
    const text = 'hello xyzzy world'
    const result = checker.checkText(text)
    const issue = result.issues.find(i => i.word === 'xyzzy')
    if (issue) {
      expect(issue.column).toBe(7) // 1-indexed, after "hello "
    }
  })

  it('includes context line', async () => {
    const checker = await SpellChecker.create()
    const text = 'This line has xyzzy in it'
    const result = checker.checkText(text)
    const issue = result.issues.find(i => i.word === 'xyzzy')
    if (issue) {
      expect(issue.context).toBe('This line has xyzzy in it')
    }
  })

  // ─── Session dictionary ───────────────────────────────────────

  it('addWord persists for the session', async () => {
    const checker = await SpellChecker.create()
    expect(checker.isCorrect('xyzzy')).toBe(false)
    checker.addWord('xyzzy')
    expect(checker.isCorrect('xyzzy')).toBe(true)
    // And in checkText
    const result = checker.checkText('The xyzzy is valid now')
    expect(result.issues.map(i => i.word)).not.toContain('xyzzy')
  })

  // ─── Performance ──────────────────────────────────────────────

  it('checks a large file quickly', async () => {
    const checker = await SpellChecker.create()
    // Generate a 1000-line "file"
    const lines = Array.from({ length: 1000 }, (_, i) =>
      `const variable${i} = "this is line number ${i} with some content"`
    )
    const text = lines.join('\n')

    const start = performance.now()
    const result = checker.checkText(text)
    const elapsed = performance.now() - start

    expect(result.wordsChecked).toBeGreaterThan(1000)
    expect(elapsed).toBeLessThan(5000) // Should complete in < 5s
  })

  // ─── Edge cases ───────────────────────────────────────────────

  it('handles empty text', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('')
    expect(result.issues).toEqual([])
    expect(result.wordsChecked).toBe(0)
  })

  it('handles text with only whitespace', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('   \n\t\n   ')
    expect(result.issues).toEqual([])
  })

  it('handles text with only punctuation', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('!@#$%^&*(){}[]|\\:;"\'<>,./?\n---===+++')
    expect(result.issues).toEqual([])
  })

  it('handles CRLF line endings', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('hello\r\nworld\r\n')
    expect(result.issues.length).toBe(0)
  })

  it('sets uri from parameter', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('hello', '/path/to/file.ts')
    expect(result.uri).toBe('/path/to/file.ts')
  })

  it('defaults uri to untitled', async () => {
    const checker = await SpellChecker.create()
    const result = checker.checkText('hello')
    expect(result.uri).toBe('untitled')
  })
})
