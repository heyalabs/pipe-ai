#!/usr/bin/env node

// pipe-ai.js
/**
 * pipe-ai: A command-line tool to interface with OpenAI API using piped input or files.
 *
 * Usage:
 *   - Piping input with a prompt provided via the `-m` option:
 *     $ git log | pipe-ai -m "Summarize the git log."
 *
 *   - Piping input without a prompt provided:
 *     $ git log | pipe-ai
 *     (The program will prompt you to enter a prompt interactively.)
 *
 *   - Reading input from a file with a prompt provided via the `-m` option:
 *     $ pipe-ai <file path> -m "Your prompt here."
 *
 *   - Outputting to a file:
 *     $ git log | pipe-ai -m "Summarize the git log." -o output.txt
 *
 *   - Using a pre-defined prompt by name:
 *     $ git log | pipe-ai -p summarize
 *
 *   - Using a pre-defined prompt by path:
 *     $ git log | pipe-ai -p /path/to/custom-prompt.txt
 *
 *   - Combining pre-defined prompt with a custom message:
 *     $ git log | pipe-ai -p summarize -m "Include author names."
 *
 *   - Using the default editor for prompt composition:
 *     $ git log | pipe-ai --editor
 *
 * Description:
 *   This script reads input from stdin or a file, takes a prompt (either via the `-m` option,
 *   the `-p` option for pre-defined prompts, the `--editor` option to compose in the default editor,
 *   or interactively), and sends the data to the OpenAI API using the configuration specified in `config.yaml`.
 *   The response from the API is then output to stdout or saved to a file if the `-o` option is used.
 */

// Import necessary modules
import { Command } from 'commander';
import { withSpinner } from './lib/utils.js';
import { log } from './lib/output.js'
import process from 'process';

import * as api from './pipe-ai-api.js';
import * as input from './lib/input.js';
import * as output from './lib/output.js'

// Initialize the command-line interface
const program = new Command()
  .version('1.0.0')
  .description('A CLI tool to interface with AI APIs using piped input or files.')
  .argument('[file]', 'File path to read input from')
  .option('-m, --message <prompt>', 'Prompt message for the AI (default: ask)')
  .option('-p, --pre-prompt <name|path>', 'Name or path of a pre-defined prompt to use')
  .option('-o, --output <file>', 'Output file to save the AI response (default: stdout)')
  .option('-c, --config <name|path>', 'Path of the configuration file (default: ./config/config.yaml)')
  .option('-e, --editor', 'Open the default editor to compose the prompt')
  .option('-v, --verbose', 'Enable verbose logging')
  .parse(process.argv);

// Extract options and arguments
const options = program.opts();
const filePath = program.args[0];
const promptMessage = options.message;
const prePromptOption = options.prePrompt;
const outputFile = options.output;
const configPath = options.config;
const useEditor = options.editor;
const verbose = options.verbose;

/**
 * Main function to run the script.
 */
async function main() {
  try {
    log.debug('# Adjust logger level based on verbosity');
    log.level = verbose ? 'debug' : 'error';

    log.debug('# Attach signal handlers');
    api.attachSignalHandlers(process)

    log.debug('# Load configuration');
    const configData = api.loadConfiguration(configPath);

    log.debug('# Dynamically import the provider module');
    const providerModule = await api.getProviderModule(configData)

    log.debug('# Load the input data (from file or stdin)');
    const inputData = await input.getInputData(filePath);

    log.debug('# Load pre-prompt if specified');
    const prePrompt = prePromptOption ? api.loadPrePrompt(prePromptOption) : '';

    log.debug('# Determine how to get the main prompt');
    const prompt = await api.getPrompt(useEditor, promptMessage, prePrompt);

    log.debug('# Combine pre-prompt and prompt');
    const fullPrompt = [prePrompt, prompt].filter(Boolean).join('\n');

    log.debug('# Generate AI response');
    // Generate AI response using ora-promise for spinner management
    const aiReply = await withSpinner(
      providerModule.getAIResponse(configData, inputData, fullPrompt),
      {
        text: 'Retrieving AI response...',
        spinner: 'dots',
      }
    );

    log.debug("# Output the AI's reply");
    await output.outputResult(aiReply, outputFile);

  } catch (err) {
    api.cleanup(err, 1);
  } finally {
    api.cleanup();
  }
}

// Execute the main function
main();
