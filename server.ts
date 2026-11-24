import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Dev server must run on port 3000 per AI Studio runtime constraints
const PORT = 3000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint for Cloud Run
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// Shared Gemini AI instance initialized on the server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    timeout: 60000,
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to construct Gemini content payload with file support
function buildGeminiContents(prompt: string, fileBase64?: string, fileMimeType?: string): any {
  if (fileBase64 && fileMimeType) {
    const isGeminiSupportedMime =
      fileMimeType === 'application/pdf' ||
      fileMimeType.startsWith('image/') ||
      fileMimeType.startsWith('audio/') ||
      fileMimeType.startsWith('video/') ||
      fileMimeType.startsWith('text/') ||
      fileMimeType === 'application/json' ||
      fileMimeType.includes('officedocument') ||
      fileMimeType.includes('msword') ||
      fileMimeType.includes('excel') ||
      fileMimeType.includes('spreadsheet');

    if (isGeminiSupportedMime) {
      return {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: fileMimeType,
              data: fileBase64,
            },
          },
        ],
      };
    }
  }
  return prompt;
}

// 1. Unary Gemini Generate Content Endpoint
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { prompt, systemInstruction, responseMimeType, useSearch, fileBase64, fileMimeType, model } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const contents = buildGeminiContents(prompt, fileBase64, fileMimeType);

    const config: Record<string, unknown> = {};
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (responseMimeType) config.responseMimeType = responseMimeType;
    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(200).json({
        text: '',
        quotaExhausted: false,
        noKey: true,
      });
    }

    const modelsToTry = model
      ? [model, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash']
      : ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash'];

    let responseText: string | null = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config,
        });
        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        const msg = err?.message || '';
        const isQuota = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
        const isAuth = msg.includes('401') || msg.includes('API_KEY_INVALID') || msg.includes('UNAUTHENTICATED');
        if (isQuota || isAuth) {
          console.warn('Gemini API notice:', msg.slice(0, 120));
          break; // Stop immediately on auth or quota failure
        }
        continue;
      }
    }

    if (!responseText) {
      // Graceful fallback response when quota/auth is reached or API is unavailable
      return res.status(200).json({
        text: '',
        quotaExhausted: true,
      });
    }

    return res.status(200).json({ text: responseText, quotaExhausted: false });
  } catch (error: any) {
    // Return graceful 200 to ensure client does not crash on quota/auth/network issues
    return res.status(200).json({
      text: '',
      quotaExhausted: true,
    });
  }
});

// 2. Streaming Gemini Generate Content Endpoint (SSE)
app.post('/api/gemini/stream', async (req, res) => {
  try {
    const { prompt, systemInstruction, responseMimeType, useSearch, fileBase64, fileMimeType, model } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const contents = buildGeminiContents(prompt, fileBase64, fileMimeType);

    const config: Record<string, unknown> = {};
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (responseMimeType) config.responseMimeType = responseMimeType;
    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const modelsToTry = model
      ? [model, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash']
      : ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash'];

    let streamStarted = false;

    for (const modelName of modelsToTry) {
      try {
        const responseStream = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config,
        });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        streamStarted = true;

        for await (const chunk of responseStream) {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }

        res.write('data: [DONE]\n\n');
        res.end();
        return;
      } catch (err: any) {
        if (streamStarted) {
          res.write(`data: ${JSON.stringify({ error: err?.message || 'Stream error' })}\n\n`);
          res.end();
          return;
        }
        const msg = err?.message || '';
        const isQuota = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
        if (isQuota) {
          continue; // Try next fallback model
        }
        break;
      }
    }

    if (!streamStarted) {
      res.status(500).json({ error: 'All streaming models unavailable' });
    }
  } catch (err: any) {
    console.error('Error in /api/gemini/stream:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Streaming failed' });
    } else {
      res.write(`data: ${JSON.stringify({ error: err?.message || 'Streaming error' })}\n\n`);
      res.end();
    }
  }
});

// HTTP server and WebSocket Server integration
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// 3. Real-Time Gemini Live API via WebSocket
wss.on('connection', async (clientWs) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    clientWs.send(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server.' }));
    clientWs.close();
    return;
  }

  try {
    const session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: 'You are a helpful assistant for high school examination preparation and curriculum specification.',
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ audio }));
          }
          if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close();
          }
        },
      },
    });

    clientWs.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio) {
          session.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        }
      } catch (e) {
        console.warn('Error handling client Live message:', e);
      }
    });

    clientWs.on('close', () => {
      try {
        session.close();
      } catch {
        // ignore
      }
    });
  } catch (liveErr: any) {
    console.error('Failed to establish Gemini Live session:', liveErr);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ error: liveErr?.message || 'Live session failed' }));
      clientWs.close();
    }
  }
});

// Upgrade HTTP connections to WebSocket for /api/gemini/live and /live
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
  if (pathname === '/api/gemini/live' || pathname === '/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
