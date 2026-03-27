/**
 * Dictionary management — loading, lookup, and suggestion generation.
 * Supports built-in word lists and custom dictionaries.
 */

import type { Dictionary } from './types'
import { Trie } from './trie'
import { COMMON_MISSPELLINGS, HIGH_FREQUENCY_WORDS } from './corrections'

// Common programming terms that should never be flagged
const PROGRAMMING_WORDS = new Set([
  // Language keywords and common terms
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
  'switch', 'case', 'break', 'continue', 'class', 'extends', 'implements', 'interface',
  'type', 'enum', 'namespace', 'import', 'export', 'default', 'from', 'async', 'await',
  'try', 'catch', 'finally', 'throw', 'new', 'delete', 'typeof', 'instanceof', 'void',
  'null', 'undefined', 'true', 'false', 'this', 'super', 'yield', 'static', 'public',
  'private', 'protected', 'readonly', 'abstract', 'override', 'declare', 'module',
  'require', 'constructor', 'prototype', 'arguments',

  // Common programming abbreviations
  'args', 'argv', 'argc', 'attr', 'attrs', 'auth', 'btn', 'calc', 'cfg', 'cli',
  'cmd', 'cmp', 'conf', 'config', 'configs', 'conn', 'const', 'ctx', 'curr',
  'db', 'decl', 'def', 'deps', 'desc', 'dest', 'dev', 'dir', 'dirs', 'dist',
  'doc', 'docs', 'dom', 'el', 'elem', 'env', 'envs', 'err', 'eval', 'evt',
  'exec', 'expr', 'ext', 'exts', 'fmt', 'fn', 'func', 'gen', 'impl',
  'idx', 'init', 'int', 'iter', 'js', 'json', 'jsx', 'len', 'lib', 'libs',
  'ln', 'loc', 'msg', 'msgs', 'mut', 'nav', 'num', 'nums', 'obj', 'objs',
  'opt', 'opts', 'os', 'param', 'params', 'pkg', 'pkgs', 'pos', 'prev',
  'proc', 'prod', 'proj', 'prop', 'props', 'proto', 'ptr', 'pub', 'pwd',
  'rc', 'recv', 'ref', 'refs', 'regex', 'regexp', 'req', 'res', 'ret',
  'rx', 'src', 'srv', 'str', 'strs', 'sys', 'td', 'tmp', 'ts', 'tsx',
  'txt', 'ui', 'uri', 'url', 'urls', 'usr', 'util', 'utils', 'val', 'vals',
  'ver', 'vm', 'ws', 'xml', 'yaml', 'yml',

  // Common technical terms
  'api', 'apis', 'ascii', 'cdn', 'cors', 'cpu', 'cron', 'css', 'csv',
  'dns', 'eof', 'fifo', 'ftp', 'gpu', 'guid', 'html', 'http', 'https',
  'io', 'ip', 'ipc', 'iso', 'jwt', 'lhs', 'lru', 'md', 'npm', 'oauth',
  'orm', 'pid', 'posix', 'pwa', 'rhs', 'rpc', 'sdk', 'sha', 'smtp',
  'sql', 'ssr', 'ssl', 'stdin', 'stdout', 'stderr', 'svg', 'tcp', 'tls',
  'udp', 'uuid', 'utf', 'wasm', 'wss',

  // Common framework/tool terms
  'bun', 'deno', 'esbuild', 'eslint', 'git', 'github', 'gitlab', 'grep',
  'jsx', 'kubernetes', 'nginx', 'nodejs', 'npm', 'pnpm', 'postgres',
  'redis', 'tsx', 'turbo', 'vite', 'vitest', 'webpack', 'yarn', 'zig',

  // Common data types and patterns
  'bool', 'boolean', 'bigint', 'uint', 'int', 'i8', 'i16', 'i32', 'i64',
  'u8', 'u16', 'u32', 'u64', 'f32', 'f64', 'usize', 'isize',
  'varchar', 'timestamp', 'datetime', 'struct', 'tuple',

  // Misc common code words
  'middleware', 'plugin', 'plugins', 'runtime', 'lifecycle', 'callback',
  'callbacks', 'async', 'sync', 'mutex', 'semaphore', 'goroutine',
  'coroutine', 'iterable', 'iterator', 'serializable', 'deserialize',
  'stringify', 'inline', 'noop', 'polyfill', 'shim', 'mixin',
  'getter', 'setter', 'accessor', 'destructor', 'allocator',
  'todo', 'fixme', 'hack', 'xxx', 'refactor', 'deprecated',
  'localhost', 'hostname', 'pathname', 'endpoint', 'endpoints',
  'monorepo', 'workspace', 'workspaces', 'upstream', 'downstream',
  'changelog', 'codebase', 'sourcemap', 'sourcemaps', 'minify',
  'transpile', 'polyfill', 'treeshake', 'bundler', 'linter',
  'formatter', 'tokenize', 'tokenizer', 'lexer', 'parser',
])

/**
 * Create a dictionary from a word list.
 * Uses a trie for efficient lookup and suggestions.
 */
export function createDictionary(words: Iterable<string>, flagWords?: Set<string>): Dictionary {
  const trie = new Trie()
  trie.insertAll(words)

  // Also insert all programming words
  trie.insertAll(PROGRAMMING_WORDS)

  const flagSet = flagWords || new Set<string>()

  return {
    has(word: string): boolean {
      // Short words (1-2 chars) are always accepted
      if (word.length <= 2) return true
      // All-uppercase short acronyms are accepted
      if (word === word.toUpperCase() && word.length <= 5) return true
      // Numbers-only are accepted
      if (/^\d+$/.test(word)) return true
      // Check programming words first (fast Set lookup)
      if (PROGRAMMING_WORDS.has(word.toLowerCase())) return true
      // Check trie
      return trie.has(word)
    },

    suggest(word: string, maxResults = 5): string[] {
      const lower = word.toLowerCase()

      // 1. Check common misspellings first (instant, high-quality)
      const known = COMMON_MISSPELLINGS.get(lower)
      if (known) return known.slice(0, maxResults)

      // 2. Get trie suggestions
      const trieSuggestions = trie.suggest(word, maxResults * 2)

      // 3. Re-rank: prefer high-frequency words
      trieSuggestions.sort((a, b) => {
        const aFreq = HIGH_FREQUENCY_WORDS.has(a) ? 0 : 1
        const bFreq = HIGH_FREQUENCY_WORDS.has(b) ? 0 : 1
        if (aFreq !== bFreq) return aFreq - bFreq
        // Then by length similarity to original
        const aLenDiff = Math.abs(a.length - lower.length)
        const bLenDiff = Math.abs(b.length - lower.length)
        return aLenDiff - bLenDiff
      })

      return trieSuggestions.slice(0, maxResults)
    },

    isFlagged(word: string): boolean {
      return flagSet.has(word.toLowerCase())
    },

    get size(): number {
      return trie.size
    },
  }
}

/**
 * Load a dictionary from a newline-delimited word list file.
 */
export async function loadDictionaryFromFile(filePath: string): Promise<Dictionary> {
  const file = Bun.file(filePath)
  const text = await file.text()
  const words = text.split('\n').map(w => w.trim()).filter(w => w.length > 0 && !w.startsWith('#'))
  return createDictionary(words)
}

/**
 * Load the built-in English dictionary.
 * Falls back to a minimal word set if the file doesn't exist.
 */
export async function loadBuiltinDictionary(): Promise<Dictionary> {
  // Try multiple paths to find the word list
  const candidates = [
    new URL('./words/en.txt', import.meta.url).pathname,
    `${import.meta.dir}/words/en.txt`,
    `${import.meta.dir}/../src/words/en.txt`,
  ]

  for (const dictPath of candidates) {
    try {
      const file = Bun.file(dictPath)
      if (await file.exists()) {
        return await loadDictionaryFromFile(dictPath)
      }
    }
    catch { continue }
  }

  // Fallback: use a minimal built-in word set
  return createDictionary(PROGRAMMING_WORDS)
}

/** Get the programming words set (for external use) */
export function getProgrammingWords(): ReadonlySet<string> {
  return PROGRAMMING_WORDS
}
