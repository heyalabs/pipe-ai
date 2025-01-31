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
- have logger in one file in order to avoid cross links
- add logging of conversation, and ability to list all conversations or show a given one

pipe-ai --continue <conversation_id>
pipe-ai list
pipe-ai show <conversation_id>

pipe-ai history

id401... "Last message..."
id002... "Last message..."
id102... "Last message..."
id001... "Last message..."
id301... "Last message..."
id231... "Last message..."

pipe-ai history --summaries

id401... "Summary..."
id002... "Summary..."
id102... "Summary..."
id001... "Summary..."
id301... "Summary..."
id231... "Summary..."

pipe-ai show <conversation_id>

pipe-ai --select <conversation_id> -m "Could you tell me some more?"
