#!/usr/bin/env node

// pipe-ai.js
/**
 * pipe-ai: A command-line tool to interface with API using piped input and user's defined prompts.
 *
 * Usage Examples:
 *   - Piping input with a prompt provided via the `-m` option:
 *     $ git log | pipe-ai -m "Summarize the git log."
 *
 *   - Piping input without a prompt provided:
 *     $ git log | pipe-ai
 *     (The program will prompt you to enter a prompt interactively.)
 *
 *   - Reading input from a file with a prompt provided via the `-m` option:
 *     $ pipe-ai /path/to/input.txt -m "Your prompt here."
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
 *   - Reading the AI's response aloud:
 *     $ git log | pipe-ai -m "Summarize the git log." --speak
 *
 *     Optionally specify a voice:
 *     $ git log | pipe-ai -m "Summarize the git log." --speak "Alex"
 *
 *   - Using a custom configuration file:
 *     $ git log | pipe-ai -c /path/to/config.yaml -m "Your prompt here."
 *
 *   - Enabling verbose logging:
 *     $ git log | pipe-ai -v -m "Summarize the git log."
 *
 * Description:
 *   This script reads input from stdin or a file, takes a prompt from the user, and sends the data to AI
 *   using a configuration file (default to `config.yaml`). The response is then output to stdout or saved
 *   to a file.
 */

// Import necessary modules
import { Command } from 'commander'
import {
  withSpinner,
  loadPipe,
  substituteVariables
} from './source/lib/utils.js'
import { log } from './source/lib/output.js'
import process from 'process'
import say from 'say'

import * as api from './source/pipe-ai-api.js'
import * as input from './source/lib/input.js'
import * as output from './source/lib/output.js'
import { getInputFromEditor } from './source/lib/editorPrompt.js'
import {
  installPipe,
  uninstallPipe,
  listInstalledPipes,
  newPipe,
  editPipe,
  showPipe
} from './source/lib/install.js'

// Initialize the command-line interface
const program = new Command()
  .version('1.0.0')
  .description(
    'A CLI tool to interface with AI APIs using piped input or files.'
  )
  .argument('[file]', 'File path to read input from')
  .option('-m, --message <prompt>', 'Prompt message for the AI (default: ask)')
  .option(
    '-p, --pre-prompt <name|path>',
    'Name or path of a pre-defined prompt to use'
  )
  .option(
    '-o, --output <file>',
    'Output file to save the AI response (default: stdout)'
  )
  .option(
    '-c, --config <name|path>',
    'Path of the configuration file (default: ./config/config.yaml)'
  )
  .option('-e, --editor', 'Open the default editor to compose the prompt')
  .option(
    '-s, --speak [voice]',
    "Use the system's text-to-speech to read the response aloud"
  )
  .option('-v, --verbose', 'Enable verbose logging')
  .action(main)

program
  .command('install <name>')
  .description(
    'Install a pipe as a standalone command in ~/.config/pipe-ai/bin'
  )
  .action((name) => {
    try {
      installPipe(name)
    } catch (err) {
      api.cleanup(err, 1)
    }
  })

program
  .command('uninstall <name>')
  .description('Uninstall a previously installed pipe')
  .action((name) => {
    try {
      uninstallPipe(name)
    } catch (err) {
      api.cleanup(err, 1)
    }
  })

program
  .command('list')
  .description('List available pipes (installed pipes are marked with *)')
  .action(() => {
    try {
      listInstalledPipes()
    } catch (err) {
      api.cleanup(err, 1)
    }
  })

program
  .command('new <name>')
  .description('Create a new pipe and open it in the editor')
  .action(async (name) => {
    try {
      await newPipe(name)
    } catch (err) {
      api.cleanup(err, 1)
    }
  })

program
  .command('edit <name>')
  .description('Edit an existing pipe in the editor')
  .action(async (name) => {
    try {
      await editPipe(name)
    } catch (err) {
      api.cleanup(err, 1)
    }
  })

program
  .command('show <name>')
  .description('Print the contents of a pipe')
  .action((name) => {
    try {
      showPipe(name)
    } catch (err) {
      api.cleanup(err, 1)
    }
  })

// Hide the default `Commands:` section and present grouped subcommands
program.configureHelp({ visibleCommands: () => [] })
program.addHelpText(
  'after',
  `
Manage pipes:
  list                          List available pipes (installed pipes are
                                marked with *)
  show <name>                   Print the contents of a pipe
  new <name>                    Create a new pipe and open it in the editor
  edit <name>                   Edit an existing pipe in the editor

Install pipes:
  install <name>                Install a pipe as a standalone command in
                                ~/.config/pipe-ai/bin
  uninstall <name>              Uninstall a previously installed pipe
`
)

program.parseAsync(process.argv)

/**
 * Main function to run the script.
 *
 * @param {string} filePath - File path passed as positional argument.
 * @param {object} options - Parsed command-line options.
 */
async function main(filePath, options) {
  const promptMessage = options.message
  const prePromptOption = options.prePrompt
  const outputFile = options.output
  const configPath = options.config
  const useEditor = options.editor
  const useSpeak = options.speak
  const verbose = options.verbose

  try {
    log.debug('# Adjust logger level based on verbosity')
    log.level = verbose ? 'debug' : 'error'

    log.debug('# Attach signal handlers')
    api.attachSignalHandlers(process)

    log.debug('# Load configuration')
    const configData = api.loadConfiguration(configPath)

    log.debug('# Dynamically import the provider module')
    const providerModule = await api.getProviderModule(configData)

    log.debug('# Load the input data (from file or stdin)')
    const inputData = await input.getInputData(filePath)

    log.debug('# Load pre-prompt if specified')
    const prePrompt = prePromptOption ? loadPipe(prePromptOption) : ''
    if (prePrompt) log.verbose(`Pre Prompt: ${prePrompt}`)

    log.debug('# Get prompt from --editor, -m or interactively')
    let prompt = ''
    if (useEditor) {
      prompt = await getInputFromEditor()
    } else if (!prePrompt && !promptMessage) {
      prompt = await input.getInteractiveUserPrompt()
    } else {
      prompt = promptMessage ? promptMessage : ''
    }
    if (prompt) log.verbose(`User Prompt: ${prompt}`)

    log.debug('# Combine pre-prompt and prompt with variable substitution')
    const fullPrompt = [
      substituteVariables(prePrompt),
      substituteVariables(prompt)
    ].join('\n')

    log.debug('# Generate AI response')
    const aiReply = await withSpinner(
      providerModule.getAIResponse(configData, inputData, fullPrompt),
      {
        text: 'Retrieving AI response...',
        spinner: 'dots'
      }
    )

    log.debug("# Output the AI's reply")
    await output.outputResult(aiReply, outputFile)

    if (useSpeak) {
      let voice = typeof useSpeak === 'string' ? useSpeak : undefined
      log.debug(
        `# Initiating text-to-speech ${voice ? `with voice: ${voice}` : ''}`
      )
      say.speak(aiReply, voice, 1.0)
    }
  } catch (err) {
    api.cleanup(err, 1)
  } finally {
    api.cleanup()
  }
}

