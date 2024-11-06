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
import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { withSpinner, getDirname } from './lib/utils.js';
import { outputResult, log } from './lib/output.js'
import process from 'process';
import { pathToFileURL } from 'url';
import { getInputData } from './lib/input.js'; 

import {
  loadConfiguration,
  loadPrePrompt,
  getPrompt,
  handleSigint,
  handleSigterm,
  cleanup
} from './pipe-ai-api.js';

// Initialize the command-line interface
const program = new Command();

// Derive __dirname equivalent in ES modules
const __dirname = getDirname(import.meta.url);

// Define the CLI options and arguments
program
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

// Optionally adjust logger level based on verbosity
log.level = verbose ? 'debug' : 'error';

/**
 * Main function to run the script.
 */
async function main() {
  try {
    log.debug('# Attach signal handlers');
    process.on('SIGINT', () => handleSigint((msg, code) => cleanup(msg, code)));
    process.on('SIGTERM', () => handleSigterm((msg, code) => cleanup(msg, code)));

    log.debug('# Load configuration');
    const configData = loadConfiguration(configPath);

    log.debug('# Get the provider from the config data');
    const providerName = configData.provider;
    if (!providerName) {
      throw new Error('Provider not specified in the configuration file.');
    }

    log.debug('# Dynamically import the provider module');
    const providerModulePath = path.join(__dirname, 'providers', `${providerName}.js`);
    if (!fs.existsSync(providerModulePath)) {
      throw new Error(`Provider module '${providerName}' not found.`);
    }
    const providerModule = await import(pathToFileURL(providerModulePath).href);

    log.debug('# Get input data (from file or stdin)');
    const inputData = await getInputData(filePath);

    log.debug('# Load pre-prompt if specified');
    let prePrompt = '';
    if (prePromptOption) {
      prePrompt = loadPrePrompt(prePromptOption);
    }

    log.debug('# Determine how to get the main prompt');
    const prompt = await getPrompt(useEditor, promptMessage, prePrompt);

    log.debug('# Disable terminal input');
    process.stdin.pause();

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

    log.debug('# Re-enable terminal input');
    process.stdin.resume();

    log.debug("# Output the AI's reply");
    await outputResult(aiReply, outputFile);

  } catch (err) {
    if (err.stack) {
      cleanup(`${err.message}\nStack Trace:\n${err.stack}`, 1);
    } else {
      cleanup(err.message, 1);
    }
  } finally {
    log.debug('# Cleanup task such as resume stdin');
    cleanup('', 0);
  }
}

// Execute the main function
main();
