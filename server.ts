import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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
    const { prompt, systemInstruction, responseMimeType, useSearch } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const config: Record<string, unknown> = {};
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (responseMimeType) config.responseMimeType = responseMimeType;
    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const modelsToTry = [
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ];

    let responseText: string | null = null;

    if (process.env.GEMINI_API_KEY) {
      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config,
          });
          if (response && response.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          const isQuota = err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');
          if (isQuota) {
            break; // Quota applies to the entire API key project, fallback immediately
          }
          continue;
        }
      }
    }

    if (!responseText) {
      // Graceful fallback response when quota is reached or API is unavailable
      return res.status(200).json({
        text: '',
        quotaExhausted: true,
      });
    }

    return res.status(200).json({ text: responseText, quotaExhausted: false });
  } catch (error: any) {
    // Return graceful 200 to ensure client does not crash on quota/network issues
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
      server: { middlewareMode: true },
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
