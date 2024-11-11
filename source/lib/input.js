// input.js

import fs from 'fs'
import os from 'os'
import readline from 'readline'

/**
 * Function to get input data from a file or stdin.
 * @param {string} filePath - The path to the input file.
 * @returns {Promise<string>} - The input data as a string.
 */
export async function getInputData(filePath) {
  if (filePath) {
    // Read from the specified file
    return await fs.promises.readFile(filePath, 'utf8')
  } else if (!process.stdin.isTTY) {
    // Read from stdin
    let data = ''
    process.stdin.setEncoding('utf8')
    for await (const chunk of process.stdin) {
      data += chunk
    }
    return data
  } else {
    // No input provided
    throw new Error(
      'No input provided. Please provide input via a file or stdin.'
    )
  }
}

/**
 * Function to get the prompt message interactively.
 * @returns {Promise<string>} - The prompt message.
 */
export async function getInteractiveUserPrompt() {
  // Determine the EOF key based on the operating system
  const eofKey = os.platform() === 'win32' ? 'Ctrl+Z (then Enter)' : 'Ctrl+D'

  // Determine the input stream for readline
  let input = fs.createReadStream('/dev/tty')

  const rl = readline.createInterface({
    input: input,
    output: null, // Prevents echoing the input
    terminal: true
  })
  const lines = []

  console.info(`Enter your prompt (press ${eofKey} on a new line to submit):`)

  return new Promise((resolve) => {
    process.stderr.write('> ')

    rl.on('line', (line) => {
      lines.push(line)
    })

    rl.on('close', () => {
      const prompt = lines.join('\n')
      if (!prompt.trim()) {
        throw new Error(
          'Prompt cannot be empty. Please provide a prompt using the -m option.'
        )
      }
      resolve(prompt)
    })
  })
}
