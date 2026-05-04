// utils.js

import fs from 'fs'
import os from 'os'
import path from 'path'
import ora from 'ora'
import { fileURLToPath } from 'url'

/**
 * Function to load a file based on its type ('config' or 'prompt').
 * It searches in user-specific directories first, then in the installation directories.
 *
 * @param {string} identifier - The name or path of the file to load.
 * @param {string} type - The type of file ('config' or 'prompt').
 * @returns {string} - The content of the loaded file.
 * @throws {Error} - If the file is not found in any of the search directories.
 */
export function loadFile(identifier, type) {
  // Derive __dirname equivalent in ES modules
  const __dirname = getDirname(import.meta.url)

  // Define the root directory as the parent of `source/lib`
  const rootDir = path.resolve(__dirname, '../..')

  // Define configuration for each file type
  const FILE_TYPES = {
    config: {
      userDir: path.join(os.homedir(), '.config', 'pipe-ai'),
      installDir: path.join(rootDir, 'config'),
      extension: '.yaml'
    },
    prompt: {
      userDir: path.join(os.homedir(), '.config', 'pipe-ai', 'prompts'),
      installDir: path.join(rootDir, 'prompts'),
      extension: '.txt'
    }
  }

  // Ensure the provided type is supported
  if (!FILE_TYPES[type]) {
    throw new Error(
      `Unsupported file type: '${type}'. Supported types are 'config' and 'prompt'.`
    )
  }

  const { userDir, installDir, extension } = FILE_TYPES[type]
  let filePath = ''

  // Check if the identifier is a valid file path
  if (fs.existsSync(identifier) && fs.lstatSync(identifier).isFile()) {
    filePath = path.resolve(identifier)
  } else {
    // Determine the file name based on type
    const fileName = `${identifier}${extension}`

    // Define the search order: user directory first, then installation directory
    const searchDirs = [userDir, installDir]

    // Search for the file in the specified directories
    for (const dir of searchDirs) {
      const potentialPath = path.join(dir, fileName)
      if (
        fs.existsSync(potentialPath) &&
        fs.lstatSync(potentialPath).isFile()
      ) {
        filePath = potentialPath
        break
      }
    }
  }

  // If the file wasn't found, throw an error with detailed message
  if (!filePath) {
    const searchDirs =
      type === 'config'
        ? [FILE_TYPES[type].userDir, FILE_TYPES[type].installDir]
        : [FILE_TYPES[type].userDir, FILE_TYPES[type].installDir]

    const searchedDirs = searchDirs.map((dir) => `"${dir}"`).join('\n')
    const fileTypeName = type === 'config' ? 'configuration' : 'prompt'

    let message = `Unable to find the ${fileTypeName} file "${identifier}".`
    message += `\nSearched the following directories in order:\n${searchedDirs}`

    throw new Error(message)
  }

  // Read and return the file content
  return fs.readFileSync(filePath, 'utf8')
}

/**
 * Strip comment lines (those starting with `#` after optional whitespace) from text.
 *
 * @param {string} text - The raw text.
 * @returns {string} - The text with comment lines removed and trimmed.
 */
export function stripComments(text) {
  return text
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n')
    .trim()
}

/**
 * Load a pipe (prompt) file and strip comment lines.
 *
 * @param {string} identifier - The name or path of the pipe.
 * @returns {string} - The pipe content with comments removed.
 */
export function loadPipe(identifier) {
  return stripComments(loadFile(identifier, 'prompt'))
}

/**
 * Substitute template variables in a pipe or message string.
 *
 *   {{date}}       current date (YYYY-MM-DD)
 *   {{datetime}}   current date and time (ISO 8601)
 *   {{env.NAME}}   environment variable NAME (empty string if unset)
 *
 * @param {string} text - The text to substitute variables in.
 * @returns {string} - The text with variables replaced.
 */
export function substituteVariables(text) {
  if (!text) return text
  const now = new Date()
  return text
    .replace(/\{\{date\}\}/g, now.toISOString().slice(0, 10))
    .replace(/\{\{datetime\}\}/g, now.toISOString())
    .replace(
      /\{\{env\.([A-Za-z_][A-Za-z0-9_]*)\}\}/g,
      (_, name) => process.env[name] ?? ''
    )
}

/**
 * Wraps a promise with an Ora spinner.
 * @param {Promise} promise - The promise to wrap.
 * @param {Object} options - Spinner options.
 * @param {string} options.text - Text to display with the spinner.
 * @param {string} options.spinner - Spinner type.
 * @returns {Promise} - The original promise.
 */
export function withSpinner(promise, options) {
  const spinner = ora(options).start()

  return promise
    .then((result) => {
      spinner.succeed('Operation completed successfully.')
      return result
    })
    .catch((error) => {
      spinner.fail('Operation failed.')
      throw error
    })
}

/**
 * Derive the __dirname equivalent in ES Modules.
 * @param {string} metaUrl - The import.meta.url of the current module.
 * @returns {string} - The directory name of the current module.
 */
export function getDirname(metaUrl) {
  return path.dirname(fileURLToPath(metaUrl))
}
