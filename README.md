# pipe-ai

A command-line tool to interface with AI APIs using piped input or files.

## Overview

pipe-ai is a simple and flexible CLI utility that allows you to interact with AI models directly from your terminal. By piping data into the tool or reading from files, you can send prompts and receive AI-generated responses seamlessly. This tool is ideal for developers, data analysts, or anyone who wants to integrate AI capabilities into their command-line workflows.

## Features

- Pipe Input Support: Read input data from other command-line tools via piping.
- File Input Support: Read input data directly from files.
- Custom Prompts: Provide prompts directly via command-line options, interactive input, or by using your default editor.
- Pre-defined Prompts: Use pre-defined prompts by name or file path.
- Output Flexibility: Output AI responses to stdout or save them to a file.
- Text-to-Speech: Optionally read the AI’s response aloud using your system’s text-to-speech capabilities.
- Configuration Files: Use custom configuration files to tailor the tool to your needs.
- Verbose Logging: Enable verbose logging for detailed information during execution.

## Installation

Ensure you have Node.js installed on your system. Then, you can install pipe-ai globally using npm:

npm install -g pipe-ai

## Usage

Here are some examples of how to use pipe-ai:

**Piping input with a prompt provided via the -m option:**

`git log | pipe-ai -m "Summarize the git log."`

**Piping input without a prompt provided (will prompt for input interactively):**

`git log | pipe-ai`

**Reading input from a file with a prompt provided via the -m option:**

`pipe-ai /path/to/input.txt -m "Your prompt here."`

**Outputting to a file:**

`git log | pipe-ai -m "Summarize the git log." -o output.txt`

**Using a pre-defined prompt by name:**

`git log | pipe-ai -p summarize`

**Using a pre-defined prompt by path:**

`git log | pipe-ai -p /path/to/custom-prompt.txt`

**Combining a pre-defined prompt with a custom message:**

`git log | pipe-ai -p summarize -m "Include author names."`

**Using the default editor for prompt composition:**

`git log | pipe-ai --editor`

**Reading the AI’s response aloud:**

`git log | pipe-ai -m "Summarize the git log." --speak`

**Optionally specify a voice:**

`git log | pipe-ai -m "Summarize the git log." --speak "Alex"`

**Using a custom configuration file:**

`git log | pipe-ai -c /path/to/config.yaml -m "Your prompt here."`

**Enabling verbose logging:**

`git log | pipe-ai -v -m "Summarize the git log."`

## Configuration

The tool uses a configuration file (default config.yaml) to manage settings such as API keys and provider-specific configurations. You can specify a custom configuration file using the -c or --config option.

## Benefits

- Seamless Integration: Easily integrate AI capabilities into your existing command-line workflows.
- Flexibility: Customize prompts, inputs, and outputs to suit your needs.
- Productivity: Quickly process and analyze data using AI without leaving the terminal.
- Accessibility: Option to have responses read aloud, enhancing accessibility.

## Example Use Cases

- Summarize Logs: Quickly summarize lengthy git logs or other command outputs.
- Data Transformation: Transform data from one format to another using AI models.
- Content Generation: Generate content based on input data and custom prompts.
- Automation: Incorporate AI responses into scripts and automated workflows.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue if you have suggestions or encounter any problems.

## License

This project is licensed under the MIT License.
