// brain.js

import Database from 'better-sqlite3'
import { Entity } from 'entity-db'
import { v4 as uuidv4 } from 'uuid'
import process from 'process'
import path from 'path'
import fs from 'fs'

/**
 * Brain class
 */
export class Brain {
  constructor(customDbPath) {
    // Initialize the SQLite database connection using better-sqlite3
    const dbPath = customDbPath || this._getDefaultDatabasePath()
    this.db = new Database(dbPath) // This is a synchronous API
  }

  /**
   * Initializes entities.
   */
  async init() {
    // Initialize the Message entity with better-sqlite3
    this.message = new Entity(this.db, 'Message', ['conversationId'])
  }

  /**
   * Save AI interaction to the Brain database.
   *
   * @param {string} aiReply - The response from the AI.
   * @param {Object} configData - The configuration data used for the request.
   * @param {string} inputData - The data fed into Pipe-AI for processing.
   * @param {string} [prePrompt] - Optional pre-prompt text.
   * @param {string} [prompt] - Optional prompt text.
   * @returns {Promise<void>} - Resolves when the message is saved to the database.
   */
  async saveAIInteraction(
    aiReply,
    configData,
    inputData,
    prePrompt = '',
    prompt = ''
  ) {
    // Ensure Brain is initialized
    if (!this.message) {
      await this.init()
    }

    // Generate a unique conversation ID
    const conversationId = uuidv4()

    // Prepare the content object with all relevant details
    const content = {
      aiReply,
      configData,
      inputData
    }
    if (prePrompt) content.prePrompt = prePrompt
    if (prompt) content.prompt = prompt

    // Save the message to the database
    await this.addMessage(conversationId, content)
  }

  /**
   * Adds a new message to a specified conversation.
   * @param {string} conversationId - The ID of the parent conversation.
   * @param {Object} content - Content data for the message.
   * @returns {Promise<Object>} - The result of the message insertion.
   */
  async addMessage(conversationId, content) {
    // Ensure Brain is initialized
    if (!this.message) {
      throw new Error('Entity not initialized. Call init() first.')
    }

    // Insert the message into the database
    return this.message.insert(content, { conversationId })
  }

  /**
   * Gets the default path for the database file.
   * The path is `~/.config/pipe-ai/db/default.sqlite`.
   * @returns {string} The full path to the default database file.
   */
  _getDefaultDatabasePath() {
    const homeDir = process.env.HOME || process.env.USERPROFILE
    const dbPath = path.join(
      homeDir,
      '.config',
      'pipe-ai',
      'db',
      'default.sqlite'
    )
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
    return dbPath
  }
}
