# ts-spell-check

Fast, zero-dependency spell checker for code. Built with Bun.

## Features

- **Zero dependencies** — pure TypeScript, runs on Bun
- **234K+ English dictionary** with 200+ programming terms built in
- **Smart word splitting** — handles camelCase, PascalCase, snake_case, kebab-case, SCREAMING_SNAKE
- **150+ common misspelling corrections** — "definately" → "definitely" instantly
- **In-document directives** — `// spell-check:disable`, `// cspell:words` (cspell-compatible)
- **Configurable** — custom words, ignore patterns, flag words, severity levels
- **Batch file checking** — parallel processing with configurable concurrency
- **VS Code extension** — real-time diagnostics with quick fixes
- **Pickier integration** — native spell-check lint rules

## Install

```bash
bun add -D ts-spell-check
```

## Quick Start

```typescript
import { SpellChecker } from 'ts-spell-check'

const checker = await SpellChecker.create()
const result = checker.checkText('This is a tset of the spel checker')

for (const issue of result.issues) {
  console.log(`${issue.line}:${issue.column} "${issue.word}" → ${issue.suggestions.join(', ')}`)
}
// 1:11 "tset" → test
// 1:23 "spel" → spec, spell, sped
```

## CLI

```bash
# Check files
spell-check .
spell-check src/**/*.ts
spell-check README.md --reporter json

# Add extra words
spell-check . --words "kubectl,nginx,redis"

# Ignore specific words
spell-check . --ignore "fixme,todo"

# Custom config
spell-check . --config .spellcheck.json
```

### Reporters

- `stylish` (default) — colored output grouped by file
- `json` — machine-readable JSON
- `compact` — one line per issue (`file:line:col severity "word"`)

## Configuration

Create `.spellcheck.json` in your project root:

```json
{
  "language": "en",
  "words": ["kubernetes", "grafana", "nginx"],
  "flagWords": ["todo", "fixme"],
  "ignoreWords": ["argv", "noop"],
  "minWordLength": 3,
  "maxSuggestions": 5,
  "files": ["**/*.ts", "**/*.md"],
  "ignorePaths": ["**/node_modules/**", "**/dist/**"],
  "severity": "warning"
}
```

Also reads `cspell.json` for compatibility.

## In-Document Directives

```typescript
// spell-check:disable
const xyzzy = 'plugh' // not flagged
// spell-check:enable

// spell-check:disable-next-line
const qwerty = 'asdf' // not flagged

// spell-check:word kubectl minikube
deploy(kubectl, minikube) // not flagged

// cspell:words also works (compatibility)
```

## API

### `SpellChecker.create(options?)`

Create a spell checker instance (async — loads dictionary).

```typescript
const checker = await SpellChecker.create({
  words: ['myTerm'],
  flagWords: ['hack'],
  ignoreWords: ['fixme'],
  minWordLength: 3,
  maxSuggestions: 5,
})
```

### `checker.checkText(text, uri?)`

Check a string for spelling errors. Returns `SpellCheckResult`.

### `checker.checkFile(filePath)`

Check a file. Returns `SpellCheckResult`.

### `checker.checkFiles(filePaths, concurrency?)`

Check multiple files in parallel. Returns only files with issues.

### `checker.isCorrect(word)`

Check if a single word is spelled correctly.

### `checker.suggest(word)`

Get spelling suggestions for a word.

### `checker.addWord(word)`

Add a word to the session dictionary (not persisted).

## Pickier Integration

When installed alongside [pickier](https://github.com/pickier/pickier), spell-check rules are available natively:

```typescript
// pickier.config.ts
export default {
  pluginRules: {
    'spell/check': 'warn',           // check all text
    'spell/check-comments': 'warn',  // check only comments
    'spell/check-markdown': 'warn',  // check only .md files
  },
}
```

## Architecture

| Module | Description |
|--------|-------------|
| `Trie` | Prefix tree — O(k) lookup, edit-distance suggestions |
| `Splitter` | Word splitter — camelCase, snake_case, acronyms, numbers |
| `Dictionary` | 234K English words + programming terms, frequency ranking |
| `Corrections` | 150+ common misspellings with instant suggestions |
| `Checker` | Main API — checkText, checkFile, checkFiles |
| `Directives` | In-document `// spell-check:disable` parsing |
| `Config` | Loads `.spellcheck.json` / `cspell.json` |

## Packages

| Package | Description |
|---------|-------------|
| `ts-spell-check` | Core library |
| `ts-spell-check-cli` | CLI tool |
| `ts-spell-check-vscode` | VS Code extension |

## License

MIT
