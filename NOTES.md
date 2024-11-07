# NOTES

- add ability to use anthropic model such as claude-ai
- add logging and so ability to recall past conversations (sessions)
- add pre-prompt so we can do git log | pipe-ai -p summarize
- using -m (no option) or no -m at all (but no pre-prompt) would open default editor
and upon save and close add the prompt message
- refactor code for config and prompt so they use same code for lookups
- rename config/ to models/
- when you use -m with no option also opens interactive prompting
- make writting in the default editor in order to take the prompt very similar to git 
- use ES modules instead: keep pipe-ai.js (which only has a main function) and create an pipe-ai-api.mjs which hosts the main pipe-ai functions.
- IMPORTANT: make sure the readline input is locled while procesing so not to record keys and execute them afterwards!
- pipe-ai leads to ask for the prompt from stdin (in the future repl mode)
- Editor Prompt: instead of a temp file we could do what git does ("~/Developer/ScriptMind/pipe-ai/.git/COMMIT_EDITMSG" 16L, 433B)
