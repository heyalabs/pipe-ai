# NOTES

- add ability to use anthropic model such as claude-ai
- add logging and so ability to recall past conversations (sessions)
- add pre-prompt so we can do git log | pipe-ai -p summarize
- using -m (no option) or no -m at all (but no pre-prompt) would open default editor
and upon save and close add the prompt message
- refactor code for config and prompt so they use same code for lookups
- rename config/ to models/
- when you use -m with no option also opens interactive prompting
