// utils.js

import fs from 'fs';
import path from 'path';
import os from 'os';
import winston from 'winston';
import ora from 'ora';

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
  // Define configuration for each file type
  const FILE_TYPES = {
    config: {
      userDir: path.join(os.homedir(), '.config', 'pipe-ai'),
      installDir: path.resolve('./config'), // Adjusted for ES modules
      extension: '.yaml',
    },
    prompt: {
      userDir: path.join(os.homedir(), '.config', 'pipe-ai', 'prompts'),
      installDir: path.resolve('./prompts'), // Adjusted for ES modules
      extension: '.txt',
    },
  };

  // Ensure the provided type is supported
  if (!FILE_TYPES[type]) {
    throw new Error(`Unsupported file type: '${type}'. Supported types are 'config' and 'prompt'.`);
  }

  const { userDir, installDir, extension } = FILE_TYPES[type];
  let filePath = '';

  // Check if the identifier is a valid file path
  if (fs.existsSync(identifier) && fs.lstatSync(identifier).isFile()) {
    filePath = path.resolve(identifier);
  } else {
    // Determine the file name based on type
    const fileName = `${identifier}${extension}`;

    // Define the search order: user directory first, then installation directory
    const searchDirs = [userDir, installDir];

    // Search for the file in the specified directories
    for (const dir of searchDirs) {
      const potentialPath = path.join(dir, fileName);
      if (fs.existsSync(potentialPath) && fs.lstatSync(potentialPath).isFile()) {
        filePath = potentialPath;
        break;
      }
    }
  }

  // If the file wasn't found, throw an error with detailed message
  if (!filePath) {
    const searchDirs = type === 'config'
      ? [FILE_TYPES[type].userDir, FILE_TYPES[type].installDir]
      : [FILE_TYPES[type].userDir, FILE_TYPES[type].installDir];

    const searchedDirs = searchDirs.map(dir => `"${dir}"`).join('\n');
    const fileTypeName = type === 'config' ? 'configuration' : 'prompt';

    let message = `Unable to find the ${fileTypeName} file "${identifier}".\n`;
    message += `\nSearched the following directories in order:\n${searchedDirs}`;

    throw new Error(message);
  }

  // Read and return the file content
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Function to get a configured Winston logger.
 *
 * @param {boolean} verbose - Flag to determine the log level.
 * @returns {winston.Logger} - Configured Winston logger instance.
 */
export const log = winston.createLogger({
  level: 'info', // Default log level
  format: winston.format.combine(
    winston.format.colorize(), // Adds color to the logs
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Adds timestamp
    winston.format.printf(({ timestamp, level, message }) => `- ${timestamp} [${level}]: ${message}`)
  ),
  transports: [
    new winston.transports.Console() // Logs to the console
  ],
});

/**
 * Wraps a promise with an Ora spinner.
 * @param {Promise} promise - The promise to wrap.
 * @param {Object} options - Spinner options.
 * @param {string} options.text - Text to display with the spinner.
 * @param {string} options.spinner - Spinner type.
 * @returns {Promise} - The original promise.
 */
export function withSpinner(promise, options) {
  const spinner = ora(options).start();

  return promise
    .then((result) => {
      spinner.succeed('Operation completed successfully.');
      return result;
    })
    .catch((error) => {
      spinner.fail('Operation failed.');
      throw error;
    });
}
