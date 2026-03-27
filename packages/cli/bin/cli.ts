#!/usr/bin/env bun
/**
 * ts-spell-check CLI — Fast spell checker for code.
 */

import process from 'node:process'
import { SpellChecker, loadConfig } from '../../core/src/index'
import type { SpellCheckResult } from '../../core/src/index'

const version = '0.1.0'

// ── Helpers ──────────────────────────────────────────────────────

const supportedExts = new Set(['ts', 'js', 'tsx', 'jsx', 'md', 'txt', 'sh', 'bash', 'zsh', 'yaml', 'yml'])

async function collectFiles(globs: string[]): Promise<string[]> {
  const files: string[] = []
  for (const pattern of globs) {
    // Single file — add directly
    if (/\.[a-zA-Z]+$/.test(pattern) && !/[*?[\]{}]/.test(pattern)) {
      files.push(pattern)
      continue
    }
    // Glob or directory
    const globPattern = /[*?[\]{}]/.test(pattern) ? pattern : `${pattern.replace(/\/$/, '')}/**/*`
    const g = new Bun.Glob(globPattern)
    for await (const file of g.scan({ dot: false })) {
      const ext = file.split('.').pop()?.toLowerCase()
      if (!ext || !supportedExts.has(ext)) continue
      if (file.includes('node_modules/') || file.includes('dist/') || file.includes('.git/')) continue
      files.push(file)
    }
  }
  return files
}

function printStylish(results: SpellCheckResult[], totalIssues: number, fileCount: number, verbose: boolean) {
  for (const r of results) {
    console.log(`\n\x1b[4m${r.uri}\x1b[0m`)
    for (const i of r.issues) {
      const sev = i.severity === 'error' ? '\x1b[31merror\x1b[0m' : '\x1b[33mwarn\x1b[0m'
      const sugg = i.suggestions.length ? ` \x1b[90m(${i.suggestions.slice(0, 3).join(', ')})\x1b[0m` : ''
      console.log(`  ${i.line}:${i.column}  ${sev}  Unknown word: "${i.word}"${sugg}`)
    }
  }
  if (totalIssues > 0)
    console.log(`\n\x1b[31m${totalIssues} spelling issue(s) in ${results.length} file(s)\x1b[0m`)
  else
    console.log(`\x1b[32mNo spelling issues found${verbose ? ` (${fileCount} files checked)` : ''}\x1b[0m`)
}

function printCompact(results: SpellCheckResult[]) {
  for (const r of results)
    for (const i of r.issues)
      console.log(`${r.uri}:${i.line}:${i.column} ${i.severity} "${i.word}"${i.suggestions.length ? ` (${i.suggestions.join(', ')})` : ''}`)
}

function printJson(results: SpellCheckResult[], totalIssues: number) {
  console.log(JSON.stringify({ files: results.length, issues: totalIssues, results }, null, 2))
}

// ── Run spell check ─────────────────────────────────────────────

async function runCheck(
  globs: string[],
  opts: { config?: string, reporter?: string, verbose?: boolean },
): Promise<number> {
  const config = await loadConfig(opts.config)
  const checker = await SpellChecker.create(config)
  const files = await collectFiles(globs)
  const results: SpellCheckResult[] = []
  let totalIssues = 0

  if (opts.verbose) console.log(`Checking ${files.length} file(s)...`)

  for (const file of files) {
    try {
      const result = await checker.checkFile(file)
      if (result.issues.length > 0) {
        results.push(result)
        totalIssues += result.issues.length
      }
    }
    catch (err: any) {
      if (opts.verbose) console.error(`Error checking ${file}: ${err.message}`)
    }
  }

  const reporter = opts.reporter || 'stylish'
  if (reporter === 'json') printJson(results, totalIssues)
  else if (reporter === 'compact') printCompact(results)
  else printStylish(results, totalIssues, files.length, !!opts.verbose)

  return totalIssues > 0 ? 1 : 0
}

// ── CLI ──────────────────────────────────────────────────────────

async function main() {
  const { CLI } = await import('@stacksjs/clapp')

  const cli = new CLI('spell-check')

  cli
    .command('[...globs]', 'Check files for spelling errors')
    .option('-c, --config <path>', 'Path to config file')
    .option('-r, --reporter <type>', 'Output format: stylish, json, compact', { default: 'stylish' })
    .option('--verbose', 'Verbose output')
    .example('spell-check .')
    .example('spell-check src/index.ts')
    .example('spell-check "src/**/*.ts" --reporter json')
    .example('spell-check . --config .spellcheck.json')
    .action(async (globs: string[], opts: Record<string, any>) => {
      if (globs.length === 0) globs = ['.']
      const code = await runCheck(globs, opts)
      process.exit(code)
    })

  cli.version(version)
  cli.help()
  cli.parse()
}

main()
