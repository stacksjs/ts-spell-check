/**
 * Configuration loading and merging.
 * Searches for .spellcheck.json, spellcheck.config.ts, or cspell.json.
 */

import type { SpellCheckConfig } from './types'

export const DEFAULT_CONFIG: SpellCheckConfig = {
  language: 'en',
  words: [],
  flagWords: [],
  ignoreWords: [],
  minWordLength: 3,
  maxSuggestions: 5,
  files: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx', '**/*.md', '**/*.txt', '**/*.sh'],
  ignorePaths: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/coverage/**',
    '**/*.lock',
    '**/package-lock.json',
  ],
  allowCompoundWords: true,
  ignoreRegExps: [
    // URLs
    'https?://[^\\s]+',
    // Email addresses
    '[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}',
    // Hex color codes
    '#[0-9a-fA-F]{3,8}\\b',
    // Import paths
    '[\'"][./][@\\w/.-]+[\'"]',
    // Inline code in markdown
    '`[^`]+`',
    // File paths
    '\\b[\\w./\\\\-]+\\.[a-zA-Z]{1,5}\\b',
  ],
  severity: 'warning',
}

const CONFIG_FILENAMES = [
  '.spellcheck.json',
  'spellcheck.config.json',
  'spellcheck.config.ts',
  'cspell.json',
  '.cspell.json',
]

/**
 * Load configuration from a file path.
 */
export async function loadConfig(configPath?: string): Promise<SpellCheckConfig> {
  if (configPath) {
    return mergeConfig(DEFAULT_CONFIG, await readConfigFile(configPath))
  }

  // Search for config files
  for (const filename of CONFIG_FILENAMES) {
    try {
      const file = Bun.file(filename)
      if (await file.exists()) {
        const userConfig = await readConfigFile(filename)
        return mergeConfig(DEFAULT_CONFIG, userConfig)
      }
    }
    catch {
      continue
    }
  }

  return { ...DEFAULT_CONFIG }
}

async function readConfigFile(filePath: string): Promise<Partial<SpellCheckConfig>> {
  const ext = filePath.split('.').pop()?.toLowerCase()

  if (ext === 'json') {
    const file = Bun.file(filePath)
    const text = await file.text()
    return JSON.parse(text) as Partial<SpellCheckConfig>
  }

  if (ext === 'ts' || ext === 'js') {
    const mod = await import(filePath)
    return (mod.default || mod) as Partial<SpellCheckConfig>
  }

  throw new Error(`Unsupported config format: ${filePath}`)
}

function mergeConfig(base: SpellCheckConfig, override: Partial<SpellCheckConfig>): SpellCheckConfig {
  return {
    ...base,
    ...override,
    words: [...(base.words || []), ...(override.words || [])],
    flagWords: [...(base.flagWords || []), ...(override.flagWords || [])],
    ignoreWords: [...(base.ignoreWords || []), ...(override.ignoreWords || [])],
    ignorePaths: override.ignorePaths ?? base.ignorePaths,
    files: override.files ?? base.files,
    ignoreRegExps: [...(base.ignoreRegExps || []), ...(override.ignoreRegExps || [])],
  }
}
