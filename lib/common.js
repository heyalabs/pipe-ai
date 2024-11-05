// common.js

import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { log } from './utils.js';

/**
 * Function to get input data from a file or stdin.
 * @param {string} filePath - The path to the input file.
 * @returns {Promise<string>} - The input data as a string.
 */
export async function getInputData(filePath) {
  if (filePath) {
    // Read from the specified file
    return await fs.promises.readFile(filePath, 'utf8');
  } else if (!process.stdin.isTTY) {
    // Read from stdin
    let data = '';
    process.stdin.setEncoding('utf8');
    for await (const chunk of process.stdin) {
      data += chunk;
    }
    return data;
  } else {
    // No input provided
    cleanup('No input provided. Please provide input via a file or stdin.');
  }
}

/**
 * Function to get the prompt message interactively.
 * @returns {Promise<string>} - The prompt message.
 */
export async function getInteractiveUserPrompt() {
  // Determine the EOF key based on the operating system
  const eofKey = os.platform() === 'win32' ? 'Ctrl+Z (then Enter)' : 'Ctrl+D';

  // Determine the input stream for readline
  let input = process.stdin;
  if (!process.stdin.isTTY) {
    // stdin is not a TTY (e.g., being piped), so try to read from /dev/tty
    try {
      input = fs.createReadStream('/dev/tty');
    } catch (err) {
      cleanup('Cannot open /dev/tty for reading. Please provide a prompt using the -m option.');
    }
  }

  console.error(`Enter your prompt (press ${eofKey} to submit):`);

  const rl = readline.createInterface({
    input: input,
    output: null,        // Prevents echoing the input
    terminal: false,     // Disables default terminal behavior
    prompt: "> "
  });

  const lines = [];

  return new Promise((resolve) => {
    process.stderr.write('> ');

    rl.on('line', (line) => {
      lines.push(line);
    });

    rl.on('close', () => {
      const prompt = lines.join('\n');
      if (!prompt.trim()) {
        cleanup('Prompt cannot be empty. Please provide a prompt using the -m option.');
      }
      resolve(prompt);
    });
  });
}

/**
 * Function to output the result to stdout or a file.
 * @param {string} result - The AI's reply.
 * @param {string} outputFile - The path to the output file.
 */
export async function outputResult(result, outputFile) {
  if (outputFile) {
    // Write the result to the specified output file
    await fs.promises.writeFile(outputFile, result, 'utf8');
    log.error(`Output saved to ${outputFile}`);
  } else {
    // Output the result to stdout
    console.log(result);
  }
}

/**
 * Function to open the default editor for prompt composition.
 * @returns {Promise<string>} - The composed prompt.
 */
export function getPromptFromEditor() {
  const initialContent = `
# Please enter your prompt. Lines starting '#' will be ignored.
# -------------------------------------------------------------
# Example:
# Summarize the following git log to highlight major changes.
#`;

  return new Promise((resolve, reject) => {
    // Determine the user's preferred editor
    const editor = process.env.EDITOR || (process.platform === 'win32' ? 'notepad' : 'vi');

    // Create a temporary file
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `pipe-ai-prompt-${Date.now()}.gitmessage`);

    // Initialize the file with a comment or instructions (optional)
    fs.writeFileSync(tmpFile, initialContent, 'utf8');

    // Open the editor with the TERM environment variable set to ensure proper terminal recognition
    const child = spawnSync(editor, [tmpFile], { 
      stdio: 'inherit', 
      shell: true 
    });

    // Check if the editor was closed successfully
    if (child.error) {
      reject(new Error(`Failed to open the editor: ${child.error.message}`));
      return;
    }

    // Read the content after editing
    let content;
    try {
      content = fs.readFileSync(tmpFile, 'utf8');
    } catch (err) {
      reject(new Error(`Failed to read the temporary prompt file: ${err.message}`));
      return;
    }

    // Delete the temporary file
    try {
      fs.unlinkSync(tmpFile);
    } catch (err) {
      console.warn(`Warning: Failed to delete the temporary prompt file "${tmpFile}". Please delete it manually.`);
    }

    // Process the content: remove lines starting with '#'
    const processedContent = content.replace(/^#.*$/gm, '').trim();

    if (!processedContent) {
      reject(new Error('Prompt is empty. Please provide a valid prompt in the editor.'));
      return;
    }

    resolve(processedContent);
  });
}

/**
 * Derive the __dirname equivalent in ES Modules.
 * @param {string} metaUrl - The import.meta.url of the current module.
 * @returns {string} - The directory name of the current module.
 */
export function getDirname(metaUrl) {
  return path.dirname(fileURLToPath(metaUrl));
}
