/**
 * Word splitter for code identifiers.
 * Handles camelCase, PascalCase, snake_case, kebab-case, SCREAMING_SNAKE_CASE,
 * and mixed patterns common in source code.
 */

/** Split result with position tracking */
export interface SplitWord {
  /** The extracted word */
  word: string
  /** Offset from the start of the original text */
  offset: number
}

/**
 * Split a code identifier into component words.
 *
 * Examples:
 *   "camelCase"        -> ["camel", "Case"]
 *   "HTTPServer"       -> ["HTTP", "Server"]
 *   "my_variable_name" -> ["my", "variable", "name"]
 *   "kebab-case"       -> ["kebab", "case"]
 *   "XMLHttpRequest"   -> ["XML", "Http", "Request"]
 *   "getHTTPSUrl"      -> ["get", "HTTPS", "Url"]
 */
export function splitIdentifier(text: string): SplitWord[] {
  const words: SplitWord[] = []
  let wordStart = 0
  let i = 0

  while (i < text.length) {
    const ch = text[i]

    // Skip non-alpha-numeric characters (separators: _, -, ., /, etc.)
    if (!isAlphaNum(ch)) {
      if (i > wordStart) {
        words.push({ word: text.slice(wordStart, i), offset: wordStart })
      }
      i++
      wordStart = i
      continue
    }

    // Detect word boundaries
    if (i > wordStart) {
      const prev = text[i - 1]
      const curr = ch

      // Separator character -> new word
      if (!isAlphaNum(prev)) {
        wordStart = i
      }
      // lowercase -> UPPERCASE transition (camelCase boundary)
      else if (isLower(prev) && isUpper(curr)) {
        words.push({ word: text.slice(wordStart, i), offset: wordStart })
        wordStart = i
      }
      // UPPERCASE -> UPPERCASE -> lowercase transition (e.g., HTTP -> S -> erver)
      // Split before the last uppercase: HTTP|Server
      else if (
        i >= 2
        && isUpper(prev)
        && isUpper(text[i - 2])
        && isLower(curr)
      ) {
        words.push({ word: text.slice(wordStart, i - 1), offset: wordStart })
        wordStart = i - 1
      }
      // digit -> alpha or alpha -> digit boundary
      else if (
        (isDigit(prev) && isAlpha(curr))
        || (isAlpha(prev) && isDigit(curr))
      ) {
        words.push({ word: text.slice(wordStart, i), offset: wordStart })
        wordStart = i
      }
    }

    i++
  }

  // Flush remaining word
  if (wordStart < text.length) {
    const remaining = text.slice(wordStart)
    if (remaining.length > 0 && isAlphaNum(remaining[0])) {
      words.push({ word: remaining, offset: wordStart })
    }
  }

  return words
}

/**
 * Extract all word-like tokens from a line of text.
 * Handles strings, comments, identifiers, and prose.
 *
 * Returns tokens with their positions in the original text.
 */
export function extractWords(text: string): SplitWord[] {
  const words: SplitWord[] = []
  // Match sequences of word characters (including hyphens within words)
  const wordPattern = /[a-zA-Z][a-zA-Z0-9'-]*[a-zA-Z0-9]|[a-zA-Z]+/g
  let match: RegExpExecArray | null

  while ((match = wordPattern.exec(text)) !== null) {
    const token = match[0]
    const offset = match.index

    // Skip things that look like hex codes, hashes, etc.
    if (/^[0-9a-f]+$/i.test(token) && token.length >= 6) continue
    // Skip single characters
    if (token.length < 2) continue

    // Split compound identifiers (camelCase, etc.)
    const parts = splitIdentifier(token)
    for (const part of parts) {
      if (part.word.length >= 2) {
        words.push({
          word: part.word,
          offset: offset + part.offset,
        })
      }
    }
  }

  return words
}

// ── Character classification helpers ─────────────────────────────

function isAlpha(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

function isAlphaNum(ch: string): boolean {
  return isAlpha(ch) || isDigit(ch)
}

function isUpper(ch: string): boolean {
  return ch >= 'A' && ch <= 'Z'
}

function isLower(ch: string): boolean {
  return ch >= 'a' && ch <= 'z'
}
