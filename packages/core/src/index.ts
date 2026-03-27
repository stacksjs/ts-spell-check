/**
 * ts-spell-check — Fast, zero-dependency spell checker for code.
 *
 * @example
 * ```ts
 * import { SpellChecker } from 'ts-spell-check'
 *
 * const checker = await SpellChecker.create()
 * const result = checker.checkText('This is a tset of the spel checker')
 * console.log(result.issues) // [{word: 'tset', ...}, {word: 'spel', ...}]
 * ```
 */

// Core API
export { SpellChecker } from './checker'

// Dictionary utilities
export { createDictionary, loadDictionaryFromFile, loadBuiltinDictionary, getProgrammingWords } from './dictionary'

// Word splitting
export { splitIdentifier, extractWords } from './splitter'
export type { SplitWord } from './splitter'

// Configuration
export { loadConfig, DEFAULT_CONFIG } from './config'

// Directives
export { parseDirectives, isSuppressed } from './directives'

// Corrections & frequency data
export { COMMON_MISSPELLINGS, HIGH_FREQUENCY_WORDS } from './corrections'

// Trie data structure (for advanced use)
export { Trie } from './trie'

// Types
export type {
  Dictionary,
  SpellCheckConfig,
  SpellCheckResult,
  SpellCheckerOptions,
  SpellDirective,
  SpellIssue,
  SpellSeverity,
} from './types'
