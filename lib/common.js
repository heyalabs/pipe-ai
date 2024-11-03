const fs = require('fs');
const os = require('os');
const readline = require('readline');

/**
 * Function to get input data from a file or stdin.
 * @param {string} filePath - The path to the input file.
 * @returns {Promise<string>} - The input data as a string.
 */
async function getInputData(filePath) {
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
    console.error('No input provided. Please provide input via a file or stdin.');
    program.help()
    process.exit(1);
  }
}

/**
 * Function to get the prompt message interactively.
 * @returns {Promise<string>} - The prompt message.
 */
async function getInteractiveUserPrompt() {
  // Determine the EOF key based on the operating system
  const eofKey = os.platform() === 'win32' ? 'Ctrl+Z (then Enter)' : 'Ctrl+D';

  // Determine the input stream for readline
  let input = process.stdin;
  if (!process.stdin.isTTY) {
    // stdin is not a TTY (e.g., being piped), so try to read from /dev/tty
    try {
      input = fs.createReadStream('/dev/tty');
    } catch (err) {
      console.error('Cannot open /dev/tty for reading. Please provide a prompt using the -m option.');
      process.exit(1);
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
    process.stderr.write('> ')

    rl.on('line', (line) => {
      lines.push(line);
    });

    rl.on('close', () => {
      const prompt = lines.join('\n');
      if (!prompt.trim()) {
        console.error('Prompt cannot be empty. Please provide a prompt using the -m option.');
        process.exit(1);
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
async function outputResult(result, outputFile) {
  if (outputFile) {
    // Write the result to the specified output file
    await fs.promises.writeFile(outputFile, result, 'utf8');
    console.error(`Output saved to ${outputFile}`);
  } else {
    // Output the result to stdout
    console.log(result);
  }
}

module.exports = { getInputData, getInteractiveUserPrompt, outputResult };
