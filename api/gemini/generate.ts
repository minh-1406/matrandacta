import { GoogleGenAI } from '@google/genai';

// Export Vercel serverless maxDuration setting (up to 60s)
export const maxDuration = 60;

export default async function handler(req: any, res: any) {
  // Enable CORS for cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      return res.status(200).json({
        text: '',
        quotaExhausted: false,
        noKey: true,
        errorMsg: 'Chưa cấu hình GEMINI_API_KEY trên Vercel/Netlify.',
      });
    }

    const { prompt, systemInstruction, responseMimeType, useSearch, fileBase64, fileMimeType } = req.body || {};
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
    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 25000,
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Official Google Gemini API models
    const modelsToTry = [
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ];

    let responseText: string | null = null;
    let lastErrorMsg = '';

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
        lastErrorMsg = err?.message || String(err);
        const isQuota = lastErrorMsg.includes('429') || lastErrorMsg.includes('RESOURCE_EXHAUSTED');
        const isAuth = lastErrorMsg.includes('401') || lastErrorMsg.includes('API_KEY_INVALID') || lastErrorMsg.includes('UNAUTHENTICATED');
        if (isQuota || isAuth) {
          console.warn(`Gemini API notice (${modelName}):`, lastErrorMsg.slice(0, 120));
          break;
        }
        continue;
      }
    }

    if (!responseText) {
      return res.status(200).json({
        text: '',
        quotaExhausted: true,
        errorMsg: lastErrorMsg.slice(0, 150) || 'Không thể gọi Gemini API.',
      });
    }

    return res.status(200).json({ text: responseText, quotaExhausted: false });
  } catch (error: any) {
    return res.status(200).json({
      text: '',
      quotaExhausted: true,
      errorMsg: error?.message || 'Lỗi xử lý serverless function.',
    });
  }
}
