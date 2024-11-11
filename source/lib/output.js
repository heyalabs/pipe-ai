// output.js

import fs from 'fs'
import winston from 'winston'

/**
 * Function to output the result to stdout or a file.
 * @param {string} result - The AI's reply.
 * @param {string} outputFile - The path to the output file.
 */
export async function outputResult(result, outputFile) {
  if (outputFile) {
    // Write the result to the specified output file
    await fs.promises.writeFile(outputFile, result, 'utf8')
    log.error(`Output saved to ${outputFile}`)
  } else {
    // Output the result to stdout
    console.log(result)
  }
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
    winston.format.printf(
      ({ timestamp, level, message }) => `- ${timestamp} [${level}]: ${message}`
    )
  ),
  transports: [
    new winston.transports.Console() // Logs to the console
  ]
})
