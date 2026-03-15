'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'claude-service' },
  transports: [new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })],
});

const SYSTEM_PROMPT = `You are the CarConnect Pro in-vehicle AI assistant for a 2013 Hyundai Elantra GT. You can:
- Check vehicle status: speed, RPM, fuel, coolant, battery, diagnostics
- Control audio: source, volume, bass, treble, balance, fade
- Navigation: plan routes, check GPS status
- Manage user profiles: list, create, switch
- Monitor system health and performance
- Play media: search YouTube, open streaming services (Prime Video, Netflix, etc.), play videos
- Have friendly conversations about anything

Keep responses SHORT — the driver is listening via voice. 1-3 sentences max. Be warm and natural.

ALWAYS use tools when relevant — don't guess vehicle data, use get_vehicle_status. Don't guess audio settings, use get_audio_status.
When the user asks to play something, watch a video, or open a streaming service, use the play_media tool.
When you change settings, briefly confirm what you did.`;

const TOOLS = [
  // --- Vehicle ---
  {
    name: 'get_vehicle_status',
    description: 'Get the current vehicle state including speed, RPM, gear, coolant temp, fuel level, battery voltage, throttle position, and engine load. Use this whenever the user asks about their car.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_diagnostics',
    description: 'Read diagnostic trouble codes (DTCs) from the vehicle. Use when the user asks about check engine light, error codes, or vehicle problems.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  // --- Audio ---
  {
    name: 'set_audio_source',
    description: 'Switch the active audio source.',
    input_schema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          enum: ['radio', 'bluetooth', 'usb', 'aux', 'android_auto', 'apple_carplay'],
          description: 'The audio source to switch to',
        },
      },
      required: ['source'],
    },
  },
  {
    name: 'set_volume',
    description: 'Set the audio volume level.',
    input_schema: {
      type: 'object',
      properties: {
        volume: { type: 'number', minimum: 0, maximum: 100, description: 'Volume level 0-100' },
      },
      required: ['volume'],
    },
  },
  {
    name: 'set_equalizer',
    description: 'Adjust audio equalizer settings: bass, treble, balance, or fade.',
    input_schema: {
      type: 'object',
      properties: {
        bass: { type: 'number', minimum: -10, maximum: 10, description: 'Bass level -10 to 10' },
        treble: { type: 'number', minimum: -10, maximum: 10, description: 'Treble level -10 to 10' },
        balance: { type: 'number', minimum: -100, maximum: 100, description: 'Balance L/R -100 to 100' },
        fade: { type: 'number', minimum: -100, maximum: 100, description: 'Fade front/rear -100 to 100' },
      },
      required: [],
    },
  },
  {
    name: 'get_audio_status',
    description: 'Get current audio source and control settings.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  // --- Navigation ---
  {
    name: 'plan_route',
    description: 'Plan a navigation route to a destination. Use when the user wants directions or wants to go somewhere.',
    input_schema: {
      type: 'object',
      properties: {
        destination: { type: 'string', description: 'Destination name or address' },
        avoidTolls: { type: 'boolean', description: 'Avoid toll roads' },
        avoidHighways: { type: 'boolean', description: 'Avoid highways' },
      },
      required: ['destination'],
    },
  },
  {
    name: 'get_navigation_status',
    description: 'Get current GPS/navigation status including position, signal, and any active route.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  // --- Profiles ---
  {
    name: 'list_profiles',
    description: 'List all user profiles. Use when the user asks about profiles or who is logged in.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'create_profile',
    description: 'Create a new user profile with a name.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name for the new profile' },
      },
      required: ['name'],
    },
  },
  {
    name: 'activate_profile',
    description: 'Switch to a different user profile by name.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the profile to activate' },
      },
      required: ['name'],
    },
  },
  // --- System ---
  {
    name: 'get_system_health',
    description: 'Get health status of all system components (vehicle, audio, navigation, OBD).',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_performance_metrics',
    description: 'Get system performance metrics including response times and resource usage.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  // --- Media ---
  {
    name: 'play_media',
    description: 'Open a video or streaming service on the infotainment display. Use when the user wants to watch YouTube, Prime Video, Netflix, or any video URL. Returns a command for the dashboard to execute.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['youtube_search', 'youtube_video', 'open_url', 'open_service', 'close'],
          description: 'The media action to perform',
        },
        query: { type: 'string', description: 'Search query for YouTube, video URL, or service name (youtube/primevideo/netflix/disneyplus/hbomax/spotify)' },
      },
      required: ['action'],
    },
  },
];

class ClaudeService {
  constructor(options = {}) {
    this._apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY || null;
    this._model = options.model || 'claude-sonnet-4-20250514';
    this._client = null;
    this._conversations = new Map();
    this._maxHistory = 30;
    this._toolHandlers = new Map();

    if (this._apiKey) {
      this._client = new Anthropic({ apiKey: this._apiKey });
      logger.info('Claude service initialized with tool use');
    } else {
      logger.warn('No ANTHROPIC_API_KEY set — Claude chat disabled');
    }
  }

  get available() {
    return this._client !== null;
  }

  registerToolHandler(name, handler) {
    this._toolHandlers.set(name, handler);
  }

  async chat(sessionId, userMessage) {
    if (!this._client) {
      throw new Error('Claude service not configured — set ANTHROPIC_API_KEY');
    }

    if (!this._conversations.has(sessionId)) {
      this._conversations.set(sessionId, []);
    }

    const history = this._conversations.get(sessionId);

    history.push({ role: 'user', content: userMessage });

    while (history.length > this._maxHistory) {
      history.shift();
    }

    try {
      // Agentic loop: keep calling Claude until we get a final text response
      let response = await this._client.messages.create({
        model: this._model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: history,
      });

      const toolsUsed = [];
      const mediaCommands = [];

      // Process tool use in a loop
      while (response.stop_reason === 'tool_use') {
        const assistantContent = response.content;
        history.push({ role: 'assistant', content: assistantContent });

        const toolResults = [];
        for (const block of assistantContent) {
          if (block.type === 'tool_use') {
            const result = await this._executeTool(block.name, block.input);
            toolsUsed.push(block.name);

            // Capture media commands to forward to dashboard
            if (block.name === 'play_media' && result && result.action) {
              mediaCommands.push(result);
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
            logger.info('Tool executed', { tool: block.name, input: block.input });
          }
        }

        history.push({ role: 'user', content: toolResults });

        response = await this._client.messages.create({
          model: this._model,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: history,
        });
      }

      // Extract final text
      const textBlocks = response.content.filter((b) => b.type === 'text');
      const assistantMessage = textBlocks.map((b) => b.text).join('\n');

      history.push({ role: 'assistant', content: response.content });

      return { reply: assistantMessage, toolsUsed, mediaCommands };
    } catch (err) {
      logger.error('Claude API error', { error: err.message });
      history.pop();
      throw err;
    }
  }

  async _executeTool(name, input) {
    const handler = this._toolHandlers.get(name);
    if (!handler) {
      return { error: `No handler registered for tool: ${name}` };
    }

    try {
      return await handler(input);
    } catch (err) {
      return { error: err.message };
    }
  }

  clearConversation(sessionId) {
    this._conversations.delete(sessionId);
  }
}

module.exports = { ClaudeService };
