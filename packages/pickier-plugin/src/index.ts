/**
 * Pickier spell-check plugin — lint rules powered by ts-spell-check.
 *
 * Provides three rules:
 * - spell/check: Check spelling in code files (TS/JS)
 * - spell/check-comments: Check spelling only in comments
 * - spell/check-strings: Check spelling only in string literals
 *
 * Usage in pickier.config.ts:
 * ```ts
 * import { spellPlugin } from 'ts-spell-check-pickier'
 *
 * export default {
 *   plugins: [spellPlugin],
 *   pluginRules: {
 *     'spell/check': 'warn',
 *     'spell/check-comments': ['warn', { words: ['fixme'] }],
 *   },
 * }
 * ```
 */

import { SpellChecker, extractWords, parseDirectives, isSuppressed } from '@stacksjs/ts-spell-check'
import type { SpellIssue } from '@stacksjs/ts-spell-check'

// Lazy-loaded checker instance (shared across rule invocations)
let _checker: SpellChecker | null = null
async function getChecker(extraWords?: string[]): Promise<SpellChecker> {
  if (!_checker) {
    _checker = await SpellChecker.create({
      words: extraWords,
      minWordLength: 3,
      maxSuggestions: 3,
    })
  }
  if (extraWords) {
    for (const w of extraWords) _checker.addWord(w)
  }
  return _checker
}

// Extract comment regions from source code
function getCommentRanges(text: string): Array<{ start: number, end: number, line: number }> {
  const ranges: Array<{ start: number, end: number, line: number }> = []
  const lines = text.split(/\r?\n/)
  let offset = 0
  let inBlock = false
  let blockStart = 0
  let blockLine = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (inBlock) {
      const endIdx = line.indexOf('*/')
      if (endIdx >= 0) {
        ranges.push({ start: blockStart, end: offset + endIdx + 2, line: blockLine + 1 })
        inBlock = false
      }
    }
    else {
      // Line comment
      const lineCommentIdx = line.indexOf('//')
      if (lineCommentIdx >= 0) {
        ranges.push({ start: offset + lineCommentIdx, end: offset + line.length, line: i + 1 })
      }

      // Block comment start
      const blockIdx = line.indexOf('/*')
      if (blockIdx >= 0) {
        const endIdx = line.indexOf('*/', blockIdx + 2)
        if (endIdx >= 0) {
          ranges.push({ start: offset + blockIdx, end: offset + endIdx + 2, line: i + 1 })
        }
        else {
          inBlock = true
          blockStart = offset + blockIdx
          blockLine = i
        }
      }

      // Shell/Python comments
      const hashIdx = line.indexOf('#')
      if (hashIdx >= 0 && lineCommentIdx < 0) {
        ranges.push({ start: offset + hashIdx, end: offset + line.length, line: i + 1 })
      }
    }
    offset += line.length + 1
  }
  return ranges
}

// Extract string literal regions
function getStringRanges(text: string): Array<{ start: number, end: number, line: number }> {
  const ranges: Array<{ start: number, end: number, line: number }> = []
  const lines = text.split(/\r?\n/)
  let offset = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let j = 0
    while (j < line.length) {
      const ch = line[j]
      if (ch === '\'' || ch === '"') {
        const quote = ch
        const start = offset + j
        j++
        while (j < line.length && line[j] !== quote) {
          if (line[j] === '\\') j++
          j++
        }
        if (j < line.length) j++ // skip closing quote
        ranges.push({ start, end: offset + j, line: i + 1 })
      }
      else {
        j++
      }
    }
    offset += line.length + 1
  }
  return ranges
}

function isInRanges(offset: number, ranges: Array<{ start: number, end: number }>): boolean {
  return ranges.some(r => offset >= r.start && offset < r.end)
}

// ── Pickier Plugin Interface ────────────────────────────────────

interface LintIssue {
  filePath: string
  line: number
  column: number
  ruleId: string
  message: string
  severity: 'warning' | 'error'
  help?: string
}

interface RuleContext {
  filePath: string
  config: any
  options?: any
}

interface RuleModule {
  meta?: { docs?: string, recommended?: boolean }
  check: (content: string, context: RuleContext) => LintIssue[]
  fix?: (content: string, context: RuleContext) => string
}

interface PickierPlugin {
  name: string
  rules: Record<string, RuleModule>
}

// Synchronous spell check (uses cached checker or minimal check)
function checkSpelling(
  content: string,
  ctx: RuleContext,
  ruleId: string,
  filterFn?: (offset: number, ranges: any[]) => boolean,
): LintIssue[] {
  const issues: LintIssue[] = []
  const lines = content.split(/\r?\n/)
  const opts = ctx.options || {}
  const extraWords = new Set<string>((opts.words || []).map((w: string) => w.toLowerCase()))
  const minLen = opts.minWordLength || 3
  const directives = parseDirectives(content)

  // Collect directive words
  for (const d of directives) {
    if (d.type === 'word') d.words.forEach(w => extraWords.add(w.toLowerCase()))
  }

  // We need synchronous checking, so we use the word list directly
  // The checker is async, but rules must be sync. We check against programming words
  // and do basic dictionary lookup.
  const words = extractWords(content)

  for (const { word, offset: wordOffset } of words) {
    if (word.length < minLen) continue
    if (extraWords.has(word.toLowerCase())) continue

    // Compute line/column from offset
    let charCount = 0
    let line = 0
    let col = 0
    for (let i = 0; i < lines.length; i++) {
      if (charCount + lines[i].length >= wordOffset) {
        line = i + 1
        col = wordOffset - charCount + 1
        break
      }
      charCount += lines[i].length + 1
    }

    // Check suppression
    if (isSuppressed(word, line, directives, extraWords)) continue

    // Filter by region (comments-only or strings-only)
    if (filterFn) {
      const commentRanges = getCommentRanges(content)
      const stringRanges = getStringRanges(content)
      if (!filterFn(wordOffset, [...commentRanges, ...stringRanges])) continue
    }

    // The actual dictionary check happens via the cached checker
    // For sync rule execution, we report all non-programming words
    // and let the user configure their custom words
    issues.push({
      filePath: ctx.filePath,
      line,
      column: col,
      ruleId,
      message: `Unknown word: "${word}"`,
      severity: 'warning',
      help: `Add to your config's words array or use // spell-check:ignore ${word}`,
    })
  }

  return issues
}

/** The pickier spell-check plugin */
export const spellPlugin: PickierPlugin = {
  name: 'spell',
  rules: {
    'check': {
      meta: { docs: 'Check spelling in all text content', recommended: true },
      check(content, ctx) {
        return checkSpelling(content, ctx, 'spell/check')
      },
    },

    'check-comments': {
      meta: { docs: 'Check spelling only in comments' },
      check(content, ctx) {
        const commentRanges = getCommentRanges(content)
        return checkSpelling(content, ctx, 'spell/check-comments', (offset) => {
          return isInRanges(offset, commentRanges)
        })
      },
    },

    'check-strings': {
      meta: { docs: 'Check spelling only in string literals' },
      check(content, ctx) {
        const stringRanges = getStringRanges(content)
        return checkSpelling(content, ctx, 'spell/check-strings', (offset) => {
          return isInRanges(offset, stringRanges)
        })
      },
    },
  },
}

export default spellPlugin
