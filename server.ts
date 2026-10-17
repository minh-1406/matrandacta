import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

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

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health check endpoint for Cloud Run
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// Shared Gemini AI instance
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    timeout: 15000,
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { prompt, systemInstruction, responseMimeType, useSearch, fileBase64, fileMimeType } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    let contents: any = prompt;
    if (fileBase64 && fileMimeType) {
      const isGeminiSupportedMime =
        fileMimeType === 'application/pdf' ||
        fileMimeType.startsWith('image/') ||
        fileMimeType.startsWith('audio/') ||
        fileMimeType.startsWith('video/');

      if (isGeminiSupportedMime) {
        contents = {
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

    const modelsToTry = [
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
    ];

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
