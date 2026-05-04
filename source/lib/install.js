// install.js

import fs from 'fs'
import fsPromises from 'fs/promises'
import os from 'os'
import path from 'path'
import tmp from 'tmp-promise'
import { loadFile, getDirname, stripComments } from './utils.js'
import { log } from './output.js'
import { openInEditor } from './editorPrompt.js'

// Directory where installed pipe wrappers live
const BIN_DIR = path.join(os.homedir(), '.config', 'pipe-ai', 'bin')

// User-writable directory for pipes (created on demand)
const USER_PROMPT_DIR = path.join(
  os.homedir(),
  '.config',
  'pipe-ai',
  'prompts'
)

// Directories searched for pipes (matches the lookup order in loadFile)
const PROMPT_DIRS = [
  USER_PROMPT_DIR,
  path.resolve(getDirname(import.meta.url), '../..', 'prompts')
]

/**
 * Resolve the path of an existing pipe by name, searching user dir then install dir.
 *
 * @param {string} name - The pipe name (no extension).
 * @returns {string|null} - The path to the pipe file, or null if not found.
 */
function resolvePipePath(name) {
  for (const dir of PROMPT_DIRS) {
    const p = path.join(dir, `${name}.txt`)
    if (fs.existsSync(p)) return p
  }
  return null
}

/**
 * Replace the user's home directory in a path with `~` for display.
 *
 * @param {string} p - The path to shorten.
 * @returns {string} - The path with home replaced by `~`.
 */
function tildify(p) {
  const home = os.homedir()
  return p.startsWith(home) ? '~' + p.slice(home.length) : p
}

/**
 * Install a pipe as a standalone executable in ~/.config/pipe-ai/bin.
 *
 * The wrapper simply calls `pipe-ai -p <name>` so it inherits the same
 * pipe resolution order (explicit path, user dir, install dir) and all
 * pipe-ai options via "$@" passthrough.
 *
 * @param {string} name - The name of the pipe to install.
 * @throws {Error} - If the pipe cannot be found.
 */
export function installPipe(name) {
  // Verify the pipe exists (throws with the standard search-path error if not)
  loadFile(name, 'prompt')

  // Ensure the bin directory exists
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true })
  }

  // Write the wrapper script (overwrites if already installed).
  // On --help/-h, fetch the pipe's first non-comment line dynamically via
  // `pipe-ai show` so edits to the pipe are reflected without reinstalling.
  // Then print pipe-ai's Arguments and Options sections (subcommands stripped).
  const wrapperPath = path.join(BIN_DIR, name)
  const wrapper = `#!/usr/bin/env bash
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
  description=$(pipe-ai show ${name} 2>/dev/null | awk '!/^[[:space:]]*#/ && NF { print; exit }')
  printf 'Usage: ${name} [options] [file]\\n\\n%s\\n\\n' "\${description:-Installed pipe: ${name}}"
  pipe-ai --help | awk '/^Arguments:/{p=1} p; /^  -h, --help/{exit}'
  exit 0
fi
exec pipe-ai -p ${name} "$@"
`
  fs.writeFileSync(wrapperPath, wrapper, { mode: 0o755 })

  log.info(`Installed pipe "${name}" -> ${tildify(wrapperPath)}`)

  // Warn if the bin directory is not on PATH (do not modify shell rc)
  const pathDirs = (process.env.PATH || '').split(path.delimiter)
  if (!pathDirs.includes(BIN_DIR)) {
    log.warn(`"${tildify(BIN_DIR)}" is not on your PATH.`)
    log.info(
      'Add it to your shell configuration to run installed pipes from anywhere:'
    )
    log.info(
      `  bash/zsh: export PATH="$HOME${BIN_DIR.slice(os.homedir().length)}:$PATH"`
    )
    log.info(`  fish:     fish_add_path ${tildify(BIN_DIR)}`)
  }
}

/**
 * Uninstall a previously installed pipe.
 *
 * @param {string} name - The name of the pipe to remove.
 * @throws {Error} - If the pipe is not installed.
 */
export function uninstallPipe(name) {
  const wrapperPath = path.join(BIN_DIR, name)
  if (!fs.existsSync(wrapperPath)) {
    throw new Error(
      `Pipe "${name}" is not installed at ${tildify(wrapperPath)}.`
    )
  }
  fs.unlinkSync(wrapperPath)
  log.info(`Uninstalled pipe "${name}" from ${tildify(wrapperPath)}`)
}

/**
 * List all available pipes from user and install directories.
 * Installed pipes (those with a wrapper in BIN_DIR) are marked with `*`.
 */
export function listInstalledPipes() {
  const names = new Set()
  for (const dir of PROMPT_DIRS) {
    if (!fs.existsSync(dir)) continue
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith('.txt')) names.add(file.slice(0, -4))
    }
  }

  if (names.size === 0) {
    log.info('No pipes found.')
    return
  }

  const sorted = [...names].sort()
  const nameWidth = Math.max(...sorted.map((n) => n.length)) + 1

  for (const name of sorted) {
    const installed = fs.existsSync(path.join(BIN_DIR, name))
    const filePath = resolvePipePath(name)
    let desc = ''
    if (filePath) {
      const raw = fs.readFileSync(filePath, 'utf8')
      const firstLine = stripComments(raw)
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l)
      if (firstLine) {
        desc = firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine
      }
    }
    const marker = installed ? '*' : ' '
    console.log(`${marker} ${name.padEnd(nameWidth)} ${desc}`)
  }
}

// Footer template appended to a new pipe (git-commit style). The cursor
// lands at line 1 so the user types content at the top; comments persist
// in the file but are stripped at load time.
const newPipeTemplate = (name) =>
  `
# Pipe: ${name}
# Please enter your input above. Lines starting with '#' will be ignored.
# -------------------------------------------------------------
# The first line is the description of your pipe. It is shown by
# 'pipe-ai list' and used as the help message of the installed pipe.
# The rest is the body of your prompt sent to the AI.
#
# You can use variables such as:
#   {{date}}       the current date (YYYY-MM-DD)
#   {{datetime}}   the current date and time (ISO 8601)
#   {{env.NAME}}   environment variable NAME
`

/**
 * Edit content in a temporary `.gitmessage` file (so editors apply
 * git-commit syntax highlighting), then return the resulting content.
 *
 * @param {string} initial - Initial content to seed the temp file with.
 * @param {string} name - The pipe name, used in the temp file prefix.
 * @returns {Promise<string>} - The content after the editor exits.
 */
async function editAsCommitMessage(initial, name) {
  const tmpFile = await tmp.file({
    prefix: `pipe-ai-pipe-${name}-`,
    postfix: '.gitmessage'
  })
  try {
    await fsPromises.writeFile(tmpFile.path, initial, 'utf8')
    await openInEditor(tmpFile.path)
    return await fsPromises.readFile(tmpFile.path, 'utf8')
  } finally {
    await tmpFile.cleanup()
  }
}

/**
 * Create a new pipe in the user prompt directory and open it in the editor.
 * If no non-comment content is entered, nothing is written.
 *
 * @param {string} name - The name of the pipe to create.
 * @throws {Error} - If a pipe with this name already exists (in any location).
 */
export async function newPipe(name) {
  const existing = resolvePipePath(name)
  if (existing) {
    throw new Error(
      `Pipe "${name}" already exists at ${tildify(existing)}. Use \`pipe-ai edit ${name}\` to modify it.`
    )
  }

  const content = await editAsCommitMessage(newPipeTemplate(name), name)

  if (!stripComments(content)) {
    log.info(`No content entered. Pipe "${name}" was not created.`)
    return
  }

  if (!fs.existsSync(USER_PROMPT_DIR)) {
    fs.mkdirSync(USER_PROMPT_DIR, { recursive: true })
  }
  const filePath = path.join(USER_PROMPT_DIR, `${name}.txt`)
  await fsPromises.writeFile(filePath, content, 'utf8')
  log.info(`Created pipe "${name}" at ${tildify(filePath)}`)
}

/**
 * Edit an existing pipe in place, wherever it lives (user or install dir).
 * Edits go through a `.gitmessage` temp file so the editor applies
 * git-commit syntax highlighting.
 *
 * @param {string} name - The name of the pipe to edit.
 * @throws {Error} - If the pipe is not found.
 */
export async function editPipe(name) {
  const existing = resolvePipePath(name)
  if (!existing) {
    throw new Error(
      `Pipe "${name}" not found. Use \`pipe-ai new ${name}\` to create it.`
    )
  }

  const initial = await fsPromises.readFile(existing, 'utf8')
  const content = await editAsCommitMessage(initial, name)
  await fsPromises.writeFile(existing, content, 'utf8')
  log.info(`Edited pipe "${name}" at ${tildify(existing)}`)
}

/**
 * Print the contents of a pipe to stdout.
 *
 * @param {string} name - The name of the pipe to show.
 * @throws {Error} - If the pipe is not found.
 */
export function showPipe(name) {
  const content = loadFile(name, 'prompt')
  process.stdout.write(content)
  if (!content.endsWith('\n')) process.stdout.write('\n')
}
