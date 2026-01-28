import { GoogleGenAI, Type } from "@google/genai";

const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const parseRawTimeData = async (text: string) => {
  try {
    console.log('Starting data extraction...');

    let rawResult;

    if (isDev) {
      // In development, call Gemini API directly
      console.log('Using direct Gemini API (dev mode)');
      const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDIpSruB_sMqJrkLhZyZDzvZZtToTC-MUA';
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
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
      if (!result) {
        throw new Error('No response from Gemini API');
      }
      rawResult = JSON.parse(result);
    } else {
      // In production, call the backend API
      console.log('Using backend API (production mode)');
      const response = await fetch('/api/parseData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        let errorMsg = 'API request failed';
        try {
          const error = await response.json();
          console.error('API Error response:', error);
          errorMsg = error.error || error.details || errorMsg;
        } catch (e) {
          const text = await response.text();
          console.error('API Error text:', text);
          errorMsg = text || errorMsg;
        }
        throw new Error(errorMsg);
      }

      rawResult = await response.json();
    }

    console.log('API Success:', rawResult);
    
    // Ensure HH:MM:SS format consistency
    const sanitize = (val: string) => {
      if (typeof val !== 'string') return '00:00:00';
      const parts = val.split(':');
      if (parts.length >= 2) {
        return parts.map(p => p.padStart(2, '0')).join(':');
      }
      return val;
    };

    return {
      ...rawResult,
      pause: sanitize(rawResult.pause),
      dispo: sanitize(rawResult.dispo),
      dead: sanitize(rawResult.dead),
      currentLogin: sanitize(rawResult.currentLogin),
      loginTimestamp: sanitize(rawResult.loginTimestamp),
      logoutTimestamp: sanitize(rawResult.logoutTimestamp),
      wait: sanitize(rawResult.wait),
      talk: sanitize(rawResult.talk),
      hold: sanitize(rawResult.hold),
      customerTalk: sanitize(rawResult.customerTalk),
    };
  } catch (e) {
    console.error("Failed to parse data:", e);
    alert('Error: ' + (e instanceof Error ? e.message : 'Unknown error'));
    return null;
  }
};

