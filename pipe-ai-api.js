// pipe-ai-api.js

import yaml from 'js-yaml';
import { loadFile, getDirname } from './lib/utils.js';
import { log } from './lib/output.js';
import { getInteractiveUserPrompt } from './lib/input.js';
import { getInputFromEditor } from './lib/editorPrompt.js';
import { pathToFileURL } from 'url';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Function to load the configuration.
 *
 * @param {string} [configOption] - The configuration file path or name.
 * @returns {object} - The parsed configuration data.
 * @throws {Error} - If the configuration file is missing required fields or not found.
 */
export function loadConfiguration(configOption) {
  // Load the configuration file content
  const content = loadFile(configOption || 'config', 'config');

  // Parse the YAML configuration
  const data = yaml.load(content);

  // Validate that the 'provider' key exists
  if (!data.provider) {
    throw new Error("The 'provider' key is missing from the configuration file.");
  }

  return data;
}

/**
 * Loads and returns the provider module specified in the configuration.
 *
 * @param {object} configData - The configuration data object.
 * @returns {Promise<object>} - The imported provider module.
 * @throws {Error} - If the provider is not specified or the module is not found.
 */
export async function getProviderModule(configData) {
  // Derive __dirname equivalent in ES modules
  const __dirname = getDirname(import.meta.url);

  log.debug('Get the provider from the config data');
  const providerName = configData.provider;
  if (!providerName) {
    throw new Error('Provider not specified in the configuration file.');
  }

  log.debug('Import the provider module');
  const providerModulePath = path.join(__dirname, 'providers', `${providerName}.js`);
  if (!fs.existsSync(providerModulePath)) {
    throw new Error(`Provider module '${providerName}' not found.`);
  }

  return await import(pathToFileURL(providerModulePath).href);
}

/**
 * Function to load a pre-defined prompt based on name or path.
 *
 * @param {string} promptOption - The name or path of the prompt file.
 * @returns {string} - The content of the prompt file.
 * @throws {Error} - If the prompt file is not found.
 */
export function loadPrePrompt(promptOption) {
  if (!promptOption) {
    throw new Error("Prompt option '-p' or '--prompt' requires a value.");
  }

  // Load the prompt file content
  return loadFile(promptOption, 'prompt');
}

/**
 * Determines and retrieves the main prompt based on user-specified options.
 *
 * @param {boolean} useEditor - Flag indicating whether to use the default editor for prompt composition.
 * @param {string} promptMessage - The custom message provided via the `-m` or `--message` option.
 * @param {string} prePrompt - The pre-defined prompt content loaded via the `-p` or `--prompt` option.
 * @returns {Promise<string>} - The final prompt to be used for the AI API.
 */
export async function getPrompt(useEditor, promptMessage, prePrompt) {
  // Initialize the prompt variable to store the final prompt
  let prompt = '';

  // Step 1: Use the default editor to compose the prompt if the `--editor` flag is set
  if (useEditor) {
    try {
      // Invoke the editor and await the user's input
      prompt = await getInputFromEditor();
    } catch (err) {
      // Handle any errors that occur while opening the editor
      cleanup(err.message);
    }
  }

  // Step 2: Append the message provided via the `-m` or `--message` option, if available
  if (promptMessage) {
    prompt += `\n${promptMessage}`;
  }

  // Step 3: If no pre-prompt, no message, and editor is not used, invoke the interactive prompt
  if (!prePrompt && !promptMessage && !useEditor) {
    try {
      // Invoke an interactive prompt to get the user's input
      prompt = await getInteractiveUserPrompt();
    } catch (err) {
      // Handle any errors that occur during the interactive prompt
      cleanup(err.message);
    }
  }

  return prompt;
}

/**
 * Function to cleanup resources and exit the process.
 *
 * @param {string} err - The err if there is one.
 * @param {number} [exitCode=0] - The exit code for the process.
 */
export function cleanup(err = null, exitCode = 0) {
  if (err instanceof Error) {
    log.error(err.message);
    log.debug(err.stack);
  }

  log.debug('# Cleaning up…');
  if (exitCode !== 0) {
    process.exit(exitCode); // Exit the process with the provided exit code
  }
}

/**
 * Attaches signal handlers to the process for graceful shutdown.
 *
 * @param {object} process - The Node.js process object.
 */
export function attachSignalHandlers(process) {
  process.on('SIGINT', () => {
    cleanup(new Error('Process interrupted by SIGINT (Ctrl+C).'), 128 + os.constants.signals.SIGINT);
  });
  
  process.on('SIGTERM', () => {
    cleanup(new Error('Process terminated by SIGTERM.'), 128 + os.constants.signals.SIGTERM);
  });
}
