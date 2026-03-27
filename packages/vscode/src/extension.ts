import * as vscode from 'vscode'
import { SpellChecker } from 'ts-spell-check'
import type { SpellCheckResult, SpellIssue } from 'ts-spell-check'

const DIAGNOSTIC_SOURCE = 'ts-spell-check'
const DIAGNOSTIC_COLLECTION = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE)

let checker: SpellChecker | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

export async function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('tsSpellCheck')

  if (!config.get<boolean>('enable', true)) return

  // Initialize spell checker
  checker = await SpellChecker.create({
    words: config.get<string[]>('customWords', []),
    ignorePaths: config.get<string[]>('ignorePaths', []),
  })

  // Register code action provider (quick fixes)
  const codeActionProvider = vscode.languages.registerCodeActionsProvider(
    { scheme: '*', language: '*' },
    new SpellCheckCodeActionProvider(),
    { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] },
  )

  // Register commands
  const addToWorkspaceCmd = vscode.commands.registerCommand(
    'tsSpellCheck.addWordToWorkspace',
    async (word: string) => {
      const config = vscode.workspace.getConfiguration('tsSpellCheck')
      const words = config.get<string[]>('customWords', [])
      if (!words.includes(word)) {
        words.push(word)
        await config.update('customWords', words, vscode.ConfigurationTarget.Workspace)
        checker?.addWord(word)
        recheckActiveEditor()
      }
    },
  )

  const addToUserCmd = vscode.commands.registerCommand(
    'tsSpellCheck.addWordToUser',
    async (word: string) => {
      const config = vscode.workspace.getConfiguration('tsSpellCheck')
      const words = config.get<string[]>('customWords', [])
      if (!words.includes(word)) {
        words.push(word)
        await config.update('customWords', words, vscode.ConfigurationTarget.Global)
        checker?.addWord(word)
        recheckActiveEditor()
      }
    },
  )

  const ignoreCmd = vscode.commands.registerCommand(
    'tsSpellCheck.ignoreWord',
    (word: string) => {
      checker?.addWord(word)
      recheckActiveEditor()
    },
  )

  // Check on document open and change
  const onDidOpen = vscode.workspace.onDidOpenTextDocument(doc => checkDocument(doc))
  const onDidChange = vscode.workspace.onDidChangeTextDocument(e => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => checkDocument(e.document), 500)
  })
  const onDidClose = vscode.workspace.onDidCloseTextDocument(doc => {
    DIAGNOSTIC_COLLECTION.delete(doc.uri)
  })

  // Check all open documents
  vscode.workspace.textDocuments.forEach(doc => checkDocument(doc))

  context.subscriptions.push(
    DIAGNOSTIC_COLLECTION,
    codeActionProvider,
    addToWorkspaceCmd,
    addToUserCmd,
    ignoreCmd,
    onDidOpen,
    onDidChange,
    onDidClose,
  )
}

export function deactivate() {
  DIAGNOSTIC_COLLECTION.clear()
  checker = null
}

function checkDocument(document: vscode.TextDocument) {
  if (!checker) return
  if (document.uri.scheme !== 'file') return

  const text = document.getText()
  const result = checker.checkText(text, document.uri.fsPath)

  const diagnostics: vscode.Diagnostic[] = result.issues.map(issue => {
    const range = new vscode.Range(
      issue.line - 1,
      issue.column - 1,
      issue.line - 1,
      issue.column - 1 + issue.word.length,
    )
    const severity = issue.severity === 'error'
      ? vscode.DiagnosticSeverity.Error
      : issue.severity === 'info'
        ? vscode.DiagnosticSeverity.Information
        : vscode.DiagnosticSeverity.Warning

    const diagnostic = new vscode.Diagnostic(range, `Unknown word: "${issue.word}"`, severity)
    diagnostic.source = DIAGNOSTIC_SOURCE
    diagnostic.code = 'spell-check'
    // Store the issue data for code actions
    ;(diagnostic as any).spellData = issue
    return diagnostic
  })

  DIAGNOSTIC_COLLECTION.set(document.uri, diagnostics)
}

function recheckActiveEditor() {
  const editor = vscode.window.activeTextEditor
  if (editor) checkDocument(editor.document)
}

class SpellCheckCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = []

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== DIAGNOSTIC_SOURCE) continue

      const issue: SpellIssue | undefined = (diagnostic as any).spellData
      if (!issue) continue

      // Suggestion replacements
      for (const suggestion of issue.suggestions.slice(0, 5)) {
        const action = new vscode.CodeAction(
          `Replace with "${suggestion}"`,
          vscode.CodeActionKind.QuickFix,
        )
        action.edit = new vscode.WorkspaceEdit()
        action.edit.replace(document.uri, diagnostic.range, suggestion)
        action.diagnostics = [diagnostic]
        action.isPreferred = issue.suggestions.indexOf(suggestion) === 0
        actions.push(action)
      }

      // Add to workspace dictionary
      const addToWorkspace = new vscode.CodeAction(
        `Add "${issue.word}" to workspace dictionary`,
        vscode.CodeActionKind.QuickFix,
      )
      addToWorkspace.command = {
        command: 'tsSpellCheck.addWordToWorkspace',
        title: 'Add to workspace dictionary',
        arguments: [issue.word],
      }
      addToWorkspace.diagnostics = [diagnostic]
      actions.push(addToWorkspace)

      // Add to user dictionary
      const addToUser = new vscode.CodeAction(
        `Add "${issue.word}" to user dictionary`,
        vscode.CodeActionKind.QuickFix,
      )
      addToUser.command = {
        command: 'tsSpellCheck.addWordToUser',
        title: 'Add to user dictionary',
        arguments: [issue.word],
      }
      addToUser.diagnostics = [diagnostic]
      actions.push(addToUser)

      // Ignore word
      const ignore = new vscode.CodeAction(
        `Ignore "${issue.word}"`,
        vscode.CodeActionKind.QuickFix,
      )
      ignore.command = {
        command: 'tsSpellCheck.ignoreWord',
        title: 'Ignore word',
        arguments: [issue.word],
      }
      ignore.diagnostics = [diagnostic]
      actions.push(ignore)
    }

    return actions
  }
}
