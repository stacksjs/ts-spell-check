/**
 * Main SpellChecker class — the primary API for spell checking text and files.
 */

import type { Dictionary, SpellCheckConfig, SpellCheckResult, SpellCheckerOptions, SpellIssue } from './types'
import { createDictionary, loadBuiltinDictionary } from './dictionary'
import { extractWords } from './splitter'
import { isSuppressed, parseDirectives } from './directives'
import { DEFAULT_CONFIG, loadConfig } from './config'

export class SpellChecker {
  private dictionary: Dictionary
  private config: SpellCheckConfig
  private ignoreWords: Set<string>
  private flagWords: Set<string>
  private ignorePatterns: RegExp[]

  private constructor(dictionary: Dictionary, config: SpellCheckConfig) {
    this.dictionary = dictionary
    this.config = config
    this.ignoreWords = new Set((config.ignoreWords || []).map(w => w.toLowerCase()))
    this.flagWords = new Set((config.flagWords || []).map(w => w.toLowerCase()))
    this.ignorePatterns = (config.ignoreRegExps || []).map(p => new RegExp(p, 'g'))
  }

  /**
   * Create a new SpellChecker instance.
   * Loads the built-in dictionary and merges with config.
   */
  static async create(options?: SpellCheckerOptions): Promise<SpellChecker> {
    const config = options
      ? { ...DEFAULT_CONFIG, ...options }
      : await loadConfig()

    const builtinDict = await loadBuiltinDictionary()

    // Merge user words into dictionary
    const allWords = new Set<string>()
    if (config.words) {
      for (const w of config.words) allWords.add(w)
    }

    // Create combined dictionary
    const userDict = allWords.size > 0 ? createDictionary(allWords) : null
    const flagSet = new Set((config.flagWords || []).map(w => w.toLowerCase()))

    const combinedDict: Dictionary = {
      has(word: string): boolean {
        if (userDict?.has(word)) return true
        return builtinDict.has(word)
      },
      suggest(word: string, maxResults?: number): string[] {
        return builtinDict.suggest(word, maxResults)
      },
      isFlagged(word: string): boolean {
        return flagSet.has(word.toLowerCase())
      },
      get size(): number {
        return builtinDict.size + (userDict?.size || 0)
      },
    }

    // Add external dictionaries
    if (options?.dictionaries) {
      const original = combinedDict.has.bind(combinedDict)
      combinedDict.has = (word: string) => {
        if (original(word)) return true
        return options.dictionaries!.some(d => d.has(word))
      }
    }

    return new SpellChecker(combinedDict, config)
  }

  /**
   * Check a string of text for spelling errors.
   */
  checkText(text: string, uri = 'untitled'): SpellCheckResult {
    const start = performance.now()
    const issues: SpellIssue[] = []
    const lines = text.split(/\r?\n/)
    let wordsChecked = 0

    // Parse directives
    const directives = parseDirectives(text)

    // Collect directive-added words
    for (const d of directives) {
      if (d.type === 'word') {
        for (const w of d.words) this.ignoreWords.add(w.toLowerCase())
      }
    }

    // Build ignore regions from regex patterns
    const ignoreRanges = this.getIgnoreRanges(text)

    let offset = 0
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx]
      const lineNum = lineIdx + 1

      // Extract words from line
      const words = extractWords(line)

      for (const { word, offset: wordOffset } of words) {
        const absoluteOffset = offset + wordOffset
        wordsChecked++

        // Skip if too short
        if (word.length < (this.config.minWordLength || 3)) continue

        // Skip if in ignore range
        if (this.isInIgnoreRange(absoluteOffset, word.length, ignoreRanges)) continue

        // Skip if suppressed by directive
        if (isSuppressed(word, lineNum, directives, this.ignoreWords)) continue

        // Check if flagged (always report)
        if (this.dictionary.isFlagged(word)) {
          issues.push({
            word,
            offset: absoluteOffset,
            line: lineNum,
            column: wordOffset + 1,
            suggestions: [],
            severity: 'error',
            context: line,
          })
          continue
        }

        // Check dictionary
        if (!this.dictionary.has(word)) {
          issues.push({
            word,
            offset: absoluteOffset,
            line: lineNum,
            column: wordOffset + 1,
            suggestions: this.dictionary.suggest(word, this.config.maxSuggestions || 5),
            severity: this.config.severity || 'warning',
            context: line,
          })
        }
      }

      offset += line.length + 1 // +1 for newline
    }

    return {
      uri,
      issues,
      wordsChecked,
      elapsedMs: performance.now() - start,
    }
  }

  /**
   * Check a file for spelling errors.
   */
  async checkFile(filePath: string): Promise<SpellCheckResult> {
    const file = Bun.file(filePath)
    const text = await file.text()
    return this.checkText(text, filePath)
  }

  /**
   * Check if a single word is spelled correctly.
   */
  isCorrect(word: string): boolean {
    if (word.length < (this.config.minWordLength || 3)) return true
    if (this.ignoreWords.has(word.toLowerCase())) return true
    return this.dictionary.has(word)
  }

  /**
   * Get suggestions for a word.
   */
  suggest(word: string): string[] {
    return this.dictionary.suggest(word, this.config.maxSuggestions || 5)
  }

  /**
   * Add a word to the session dictionary (not persisted).
   */
  addWord(word: string): void {
    this.ignoreWords.add(word.toLowerCase())
  }

  /** Get the current config */
  getConfig(): SpellCheckConfig {
    return { ...this.config }
  }

  // ── Private ────────────────────────────────────────────────────

  private getIgnoreRanges(text: string): Array<[number, number]> {
    const ranges: Array<[number, number]> = []
    for (const pattern of this.ignorePatterns) {
      pattern.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = pattern.exec(text)) !== null) {
        ranges.push([match.index, match.index + match[0].length])
      }
    }
    return ranges.sort((a, b) => a[0] - b[0])
  }

  private isInIgnoreRange(offset: number, length: number, ranges: Array<[number, number]>): boolean {
    for (const [start, end] of ranges) {
      if (start > offset + length) break
      if (offset >= start && offset + length <= end) return true
    }
    return false
  }
}
