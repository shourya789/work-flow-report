import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

export default async (req: VercelRequest, res: VercelResponse) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;
    console.log('API called with text length:', text?.length);

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // API key is kept secret in backend
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('API key configured:', !!apiKey);
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are a specialized data extractor for dialer performance reports. 
      Look at the provided text and extract these 12 specific values. 
      Note that labels and values might be squashed together.
      
      FIELDS TO EXTRACT:
      1. pause: (HH:MM:SS) - Often labeled "Total Pause Time"
      2. dispo: (HH:MM:SS) - Often labeled "Total Dispo Time"
      3. dead: (HH:MM:SS) - Often labeled "Total Dead Time"
      4. currentLogin: (HH:MM:SS) - Often labeled "Total Login Time" (Duration)
      5. loginTimestamp: (HH:MM:SS) - Often labeled "Login At" or "Session Start"
      6. logoutTimestamp: (HH:MM:SS) - Often labeled "Logout At" or "Session End"
      7. wait: (HH:MM:SS) - Often labeled "Total Wait Time"
      8. talk: (HH:MM:SS) - Often labeled "Total Talk Time"
      9. hold: (HH:MM:SS) - Often labeled "Total Hold Time"
      10. customerTalk: (HH:MM:SS) - Often labeled "Customer Talk Time"
      11. inbound: (Integer) - Look for "Inbound Calls" count
      12. outbound: (Integer) - Look for "Outbound Calls" count

      RULES:
      - If a time value is missing, return "00:00:00".
      - If a call count is missing, return 0.
      - Clean up any squashed text (e.g., "Time3:22:08" -> "03:22:08").
      
      TEXT TO PARSE:
      """
      ${text}
      """`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pause: { type: Type.STRING },
            dispo: { type: Type.STRING },
            dead: { type: Type.STRING },
            currentLogin: { type: Type.STRING },
            loginTimestamp: { type: Type.STRING },
            logoutTimestamp: { type: Type.STRING },
            wait: { type: Type.STRING },
            talk: { type: Type.STRING },
            hold: { type: Type.STRING },
            customerTalk: { type: Type.STRING },
            inbound: { type: Type.INTEGER },
            outbound: { type: Type.INTEGER },
          },
          required: [
            'pause', 'dispo', 'dead', 'currentLogin', 'loginTimestamp',
            'logoutTimestamp', 'wait', 'talk', 'hold', 'customerTalk', 'inbound', 'outbound'
          ]
        }
      }
    });

    const result = response.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('Gemini response received:', !!result);
    
    if (!result) {
      console.error('No response from Gemini API. Full response:', JSON.stringify(response));
      return res.status(500).json({ error: 'No response from Gemini API', details: JSON.stringify(response) });
    }

    const parsedData = JSON.parse(result);
    return res.status(200).json(parsedData);

  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      error: 'Failed to parse data',
      details: errorMessage
    });
  }
};
