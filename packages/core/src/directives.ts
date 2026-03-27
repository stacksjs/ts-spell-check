/**
 * Parse in-document spell-check directives from comments.
 *
 * Supported formats (in any comment style: //, #, /*, --, etc.):
 *   spell-check:disable
 *   spell-check:enable
 *   spell-check:disable-next-line
 *   spell-check:ignore word1 word2
 *   spell-check:word word1 word2
 *   cspell:disable (compatibility)
 *   cspell:words word1, word2 (compatibility)
 */

import type { SpellDirective } from './types'

const DIRECTIVE_PATTERN = /(?:spell-check|spellcheck|cspell)\s*:\s*(disable-next-line|disable|enable|ignore|words?)\s*(.*)?/i

/**
 * Parse all spell-check directives from source text.
 */
export function parseDirectives(text: string): SpellDirective[] {
  const directives: SpellDirective[] = []
  const lines = text.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const match = DIRECTIVE_PATTERN.exec(line)
    if (!match) continue

    const action = match[1].toLowerCase()
    const args = (match[2] || '').trim()
    const words = args
      ? args.split(/[\s,]+/).map(w => w.trim()).filter(w => w.length > 0)
      : []

    switch (action) {
      case 'disable':
        directives.push({ type: 'disable', words, line: i + 1 })
        break
      case 'enable':
        directives.push({ type: 'enable', words, line: i + 1 })
        break
      case 'disable-next-line':
        directives.push({ type: 'disable-next-line', words, line: i + 1 })
        break
      case 'ignore':
        directives.push({ type: 'ignore', words, line: i + 1 })
        break
      case 'word':
      case 'words':
        directives.push({ type: 'word', words, line: i + 1 })
        break
    }
  }

  return directives
}

/**
 * Check if a word at a given line is suppressed by directives.
 */
export function isSuppressed(
  word: string,
  line: number,
  directives: SpellDirective[],
  ignoreWords: Set<string>,
): boolean {
  // Check explicit ignore words
  if (ignoreWords.has(word.toLowerCase())) return true

  // Check directives
  let disabled = false
  let disableNextLine = -1

  for (const d of directives) {
    if (d.line > line) break

    switch (d.type) {
      case 'disable':
        if (d.words.length === 0 || d.words.some(w => w.toLowerCase() === word.toLowerCase())) {
          disabled = true
        }
        break
      case 'enable':
        if (d.words.length === 0 || d.words.some(w => w.toLowerCase() === word.toLowerCase())) {
          disabled = false
        }
        break
      case 'disable-next-line':
        disableNextLine = d.line
        break
      case 'ignore':
      case 'word':
        if (d.words.some(w => w.toLowerCase() === word.toLowerCase())) {
          return true
        }
        break
    }
  }

  // Check disable-next-line (directive on line N suppresses line N+1)
  if (disableNextLine === line - 1) return true

  return disabled
}
