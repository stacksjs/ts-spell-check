# CLAUDE.md

## Overview

ts-spell-check is a fast, zero-dependency spell checker for code built with Bun. It's designed as a lighter alternative to cspell with no external dependencies.

## Monorepo Structure

- `packages/core/` — Core library: trie dictionary, word splitter, spell checker, config
- `packages/cli/` — CLI tool for checking files
- `packages/vscode/` — VS Code extension with real-time checking and quick fixes
- `packages/pickier-plugin/` — Pickier lint rules for spell checking

## Commands

```bash
bun i                    # Install dependencies
bun test                 # Run all tests
bun test packages/core   # Run core tests only
bun run build            # Build all packages
```

## Architecture

1. **Trie** (`core/src/trie.ts`) — Prefix tree for dictionary storage. O(k) lookup, edit-distance suggestions.
2. **Splitter** (`core/src/splitter.ts`) — Splits camelCase, snake_case, PascalCase, SCREAMING_SNAKE, etc.
3. **Dictionary** (`core/src/dictionary.ts`) — Loads word lists, includes 50K+ English words + programming terms.
4. **Checker** (`core/src/checker.ts`) — Main API: `SpellChecker.create()`, `checkText()`, `checkFile()`.
5. **Directives** (`core/src/directives.ts`) — In-document `// spell-check:disable` directives (cspell-compatible).
6. **Config** (`core/src/config.ts`) — Loads `.spellcheck.json` or `cspell.json` configs.

## Key Design Decisions

- Zero external dependencies — only Bun APIs
- Trie-based dictionary for O(k) lookup performance
- Built-in 50K+ English dictionary + 200+ programming terms
- cspell directive compatibility (`// cspell:words`, `// cspell:disable`)
- Word splitter handles all common code naming conventions
- Pickier integration via plugin system (not built-in)
