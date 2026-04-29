/**
 * Compact trie (prefix tree) for fast dictionary lookups and suggestions.
 * Zero dependencies — pure TypeScript/Bun implementation.
 */

interface TrieNode {
  /** Child nodes keyed by character */
  children: Map<string, TrieNode>
  /** Whether this node marks the end of a word */
  isEnd: boolean
}

function createNode(): TrieNode {
  return { children: new Map(), isEnd: false }
}

export class Trie {
  private root: TrieNode = createNode()
  private wordCount = 0

  /** Number of words stored */
  get size(): number {
    return this.wordCount
  }

  /** Insert a word into the trie */
  insert(word: string): void {
    if (word.length === 0) return
    let node = this.root
    for (const ch of word.toLowerCase()) {
      let child = node.children.get(ch)
      if (!child) {
        child = createNode()
        node.children.set(ch, child)
      }
      node = child
    }
    if (!node.isEnd) {
      node.isEnd = true
      this.wordCount++
    }
  }

  /** Check if a word exists (case-insensitive) */
  has(word: string): boolean {
    const node = this.traverse(word.toLowerCase())
    return node !== null && node.isEnd
  }

  /** Check if any word starts with the given prefix */
  hasPrefix(prefix: string): boolean {
    return this.traverse(prefix.toLowerCase()) !== null
  }

  /** Get all words starting with a prefix (limited) */
  getWordsWithPrefix(prefix: string, limit = 10): string[] {
    const node = this.traverse(prefix.toLowerCase())
    if (!node) return []
    const results: string[] = []
    this.collectWords(node, prefix.toLowerCase(), results, limit)
    return results
  }

  /**
   * Find words similar to the input using edit distance.
   * Results are sorted by: edit distance first, then word frequency score
   * (shorter common words rank higher), then alphabetically.
   */
  suggest(word: string, maxResults = 5, maxDistance = 2): string[] {
    const target = word.toLowerCase()
    const results: Array<{ word: string, distance: number }> = []

    // BFS through the trie computing edit distance
    this.suggestRecursive(this.root, '', target, maxDistance, results)

    // Sort by distance, then by frequency heuristic (shorter & common words first)
    results.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance
      // Prefer words closer in length to the target
      const aLenDiff = Math.abs(a.word.length - target.length)
      const bLenDiff = Math.abs(b.word.length - target.length)
      if (aLenDiff !== bLenDiff) return aLenDiff - bLenDiff
      // Prefer shorter words (more common in English)
      if (a.word.length !== b.word.length) return a.word.length - b.word.length
      return a.word.localeCompare(b.word)
    })

    return results.slice(0, maxResults).map(r => r.word)
  }

  /** Insert all words from an iterable */
  insertAll(words: Iterable<string>): void {
    for (const word of words) {
      if (word.length > 0) this.insert(word)
    }
  }

  /** Serialize to a compact format for caching */
  serialize(): string {
    const words: string[] = []
    this.collectWords(this.root, '', words, Infinity)
    return words.join('\n')
  }

  /** Build trie from serialized format */
  static deserialize(data: string): Trie {
    const trie = new Trie()
    for (const line of data.split('\n')) {
      const word = line.trim()
      if (word.length > 0) trie.insert(word)
    }
    return trie
  }

  // ── Private ────────────────────────────────────────────────────

  private traverse(word: string): TrieNode | null {
    let node = this.root
    for (const ch of word) {
      const child = node.children.get(ch)
      if (!child) return null
      node = child
    }
    return node
  }

  private collectWords(node: TrieNode, prefix: string, results: string[], limit: number): void {
    if (results.length >= limit) return
    if (node.isEnd) results.push(prefix)
    for (const [ch, child] of node.children) {
      if (results.length >= limit) return
      this.collectWords(child, prefix + ch, results, limit)
    }
  }

  private suggestRecursive(
    node: TrieNode,
    current: string,
    target: string,
    maxDistance: number,
    results: Array<{ word: string, distance: number }>,
  ): void {
    if (node.isEnd) {
      const dist = this.editDistance(current, target)
      if (dist <= maxDistance) {
        results.push({ word: current, distance: dist })
      }
    }

    // Prune: don't recurse if we're already too far past the target length
    if (current.length > target.length + maxDistance) return

    // Limit total results to avoid combinatorial explosion
    if (results.length > 50) return

    for (const [ch, child] of node.children) {
      this.suggestRecursive(child, current + ch, target, maxDistance, results)
    }
  }

  /** Levenshtein edit distance */
  private editDistance(a: string, b: string): number {
    const m = a.length
    const n = b.length
    if (m === 0) return n
    if (n === 0) return m

    // Use single-row optimization
    let prev = new Array<number>(n + 1)
    let curr = new Array<number>(n + 1)

    for (let j = 0; j <= n; j++) prev[j] = j

    for (let i = 1; i <= m; i++) {
      curr[0] = i
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        curr[j] = Math.min(
          prev[j] + 1,      // deletion
          curr[j - 1] + 1,  // insertion
          prev[j - 1] + cost, // substitution
        )
      }
      const tmp = prev
      prev = curr
      curr = tmp
    }
    return prev[n]
  }
}
