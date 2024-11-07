// editorPrompt.js

import { spawn } from 'child_process';
import fs from 'fs';
import fsPromises from 'fs/promises';
import tmp from 'tmp-promise';
import { log } from './output.js';

/**
 * Main function to get input from the user's preferred editor.
 * @returns {Promise<string>} - The user's input after editing.
 */
export async function getInputFromEditor() {
  const tmpFile = await createTempFile();
  const editorProcess = spawnEditorProcess(tmpFile.path);
  const userInput = await handleEditorProcess(editorProcess, tmpFile);
  return userInput;
}

/**
 * Creates a temporary file with initial content.
 * @returns {Promise<Object>} - The temporary file object.
 */
async function createTempFile() {
  try {
    const tmpFile = await tmp.file({
      prefix: `pipe-ai-prompt-${Date.now()}-`,
      postfix: '.gitmessage',
    });
    const initialContent = `
# Please enter your input below. Lines starting with '#' will be ignored.
# -------------------------------------------------------------
# Example:
# Summarize the following git log to highlight major changes.
#`;
    await fsPromises.writeFile(tmpFile.path, initialContent, 'utf8');
    log.debug(`Temporary file created at: ${tmpFile.path}`);
    return tmpFile;
  } catch (err) {
    throw new Error(`Failed to create temporary file: ${err.message}`);
  }
}

/**
 * Spawns the editor process.
 * @param {string} filePath - The path to the temporary file.
 * @returns {ChildProcess} - The spawned editor process.
 */
function spawnEditorProcess(filePath) {
  const editor = getDefaultEditor()

  log.debug(`Opening editor: ${editor}`);
  return spawn(editor, [filePath], {
    stdio: configureStdio(),
    shell: true,
    env: process.env,
  });

  function getDefaultEditor() {
    return process.env.GIT_EDITOR ||
    process.env.VISUAL ||
    process.env.EDITOR ||
    (process.platform === 'win32' ? 'notepad' : 'vi')
  }

  function configureStdio() {
    if (process.stdin.isTTY) {
      log.debug('Stdio inherited from parent process.');
      return ['inherit', 'inherit', 'inherit'];
    } else {
      const terminalFd = getTerminalFd();
      log.debug('Stdio configured to use terminal for stdin.');
      return [terminalFd, 'inherit', 'inherit'];
    }
  }

  function getTerminalFd() {
    if (process.platform === 'win32') {
      // On Windows, 'CON' refers to the console
      return fs.openSync('CON', 'r');
    } else {
      // On Unix-like systems, '/dev/tty' refers to the controlling terminal
      return fs.openSync('/dev/tty', 'r');
    }
  }
}

/**
 * Handles the editor process events and resolves the user input.
 * @param {ChildProcess} editorProcess - The spawned editor process.
 * @param {Object} tmpFile - The temporary file object.
 * @returns {Promise<string>} - The processed user input.
 */
function handleEditorProcess(editor, tmpFile) {
  // Setup the editor spawn process
  return new Promise((resolve, reject) => {

    // On exit read and process content from the temp file
    editor.on('exit', async (code) => {
      try {
        if (code !== 0) {
          throw new Error(`Editor exited with code ${code}`);
        }

        const userInput = await readTempFile(tmpFile.path);
        resolve(userInput);
      } catch (err) {
        reject(err);
      } finally {
        await deleteTempFile(tmpFile);
      }
    });

    // Make sure we always delete temp file on cleanup
    editor.on('error', async (err) => {
      try {
        throw new Error(`Failed to launch editor: ${err.message}`);
      } catch (error) {
        reject(error);
      } finally {
        await deleteTempFile(tmpFile);
      }
    });

  });

  async function readTempFile(filePath) {
    try {
      const content = await fsPromises.readFile(filePath, 'utf8');
      const processedContent = content
        .split('\n')
        .filter(line => !line.trim().startsWith('#'))
        .join('\n')
        .trim();

      if (!processedContent) {
        throw new Error('No input found in the editor.');
      }

      return processedContent;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async function deleteTempFile(tmpFile) {
    try {
      await tmpFile.cleanup();
    } catch (err) {
      log.warn(`Warning: Failed to delete temporary file "${tmpFile.path}": ${err.message}`);
    }
  }

}
