/** Severity of a spell issue */
export type SpellSeverity = 'error' | 'warning' | 'info'

/** A single spelling issue found in text */
export interface SpellIssue {
  /** The misspelled word */
  word: string
  /** Byte offset in the source text */
  offset: number
  /** Line number (1-indexed) */
  line: number
  /** Column number (1-indexed) */
  column: number
  /** Suggested corrections */
  suggestions: string[]
  /** Issue severity */
  severity: SpellSeverity
  /** Context: the full line containing the issue */
  context?: string
}

/** Result of spell-checking a document */
export interface SpellCheckResult {
  /** File path or document URI */
  uri: string
  /** All issues found */
  issues: SpellIssue[]
  /** Number of words checked */
  wordsChecked: number
  /** Time taken in milliseconds */
  elapsedMs: number
}

/** Configuration for the spell checker */
export interface SpellCheckConfig {
  /** Language code (default: 'en') */
  language?: string
  /** Words to add to the dictionary */
  words?: string[]
  /** Words to always flag as errors */
  flagWords?: string[]
  /** Words to ignore (never flag) */
  ignoreWords?: string[]
  /** Minimum word length to check (default: 3) */
  minWordLength?: number
  /** Maximum number of suggestions per word (default: 5) */
  maxSuggestions?: number
  /** File patterns to include */
  files?: string[]
  /** File patterns to ignore */
  ignorePaths?: string[]
  /** Enable compound word checking (camelCase, etc.) */
  allowCompoundWords?: boolean
  /** Regular expressions for text regions to ignore (e.g., URLs, hex codes) */
  ignoreRegExps?: string[]
  /** Per-file-pattern overrides */
  overrides?: Array<{
    files: string[]
    words?: string[]
    ignoreWords?: string[]
  }>
  /** Severity for misspelled words (default: 'warning') */
  severity?: SpellSeverity
}

/** A spell-check dictionary interface */
export interface Dictionary {
  /** Check if a word exists in the dictionary */
  has(word: string): boolean
  /** Get spelling suggestions for a word */
  suggest(word: string, maxResults?: number): string[]
  /** Check if a word is flagged (forbidden) */
  isFlagged(word: string): boolean
  /** Number of words in the dictionary */
  readonly size: number
}

/** Options for creating a spell checker instance */
export interface SpellCheckerOptions extends SpellCheckConfig {
  /** Additional dictionaries to load */
  dictionaries?: Dictionary[]
}

/** In-document directive */
export interface SpellDirective {
  /** Directive type */
  type: 'disable' | 'enable' | 'disable-next-line' | 'word' | 'ignore'
  /** Words affected (empty = all) */
  words: string[]
  /** Line number where directive appears */
  line: number
}
