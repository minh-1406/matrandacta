import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const { prompt, systemInstruction, responseMimeType, useSearch, fileBase64, fileMimeType, model } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    let contents: any = prompt;
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
    if (useSearch) config.tools = [{ googleSearch: {} }];

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 60000,
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const modelName = model || 'gemini-3.8-flash';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents,
      config,
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Streaming failed' });
    } else {
      res.write(`data: ${JSON.stringify({ error: err?.message || 'Streaming error' })}\n\n`);
      res.end();
    }
  }
}
