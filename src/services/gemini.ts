import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });

const FALLBACK_MODEL = "gemini-3-flash-preview";

async function generateContentWithFallback(modelName: string, contents: any, config: any = {}) {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config
    });
    return response;
  } catch (error: any) {
    // Check for quota/limit errors or general failures
    if (modelName !== FALLBACK_MODEL && (error.status === 429 || error.message?.includes("quota") || error.message?.includes("limit"))) {
      console.warn(`Model ${modelName} failed, falling back to ${FALLBACK_MODEL}`);
      return await ai.models.generateContent({
        model: FALLBACK_MODEL,
        contents,
        config
      });
    }
    throw error;
  }
}

export async function generateSlug(url: string, modelName: string = "gemini-3.1-pro-preview") {
  try {
    const response = await generateContentWithFallback(modelName, `Extract the book title from this URL: "${url}". 
      Exclude domain and ID. 
      Convert it to Latin characters (transliterate if needed), keeping hyphens.
      Limit to 40 characters.
      Output ONLY the final string. No explanations.`);
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini Slug Error:", error);
    return "";
  }
}

export async function generateHeadline(title: string, modelName: string = "gemini-3.1-pro-preview") {
  try {
    const response = await generateContentWithFallback(modelName, `Create a headline for the book "${title}".
      Format: Always start with "Новинка!" followed by the book title in quotes «...».
      Example: Новинка! «Твое сердце будет разбито».
      Output ONLY the headline.`);
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini Headline Error:", error);
    return "";
  }
}

export async function generateAdTexts(title: string, description: string, modelName: string = "gemini-3.1-pro-preview") {
  try {
    const response = await generateContentWithFallback(modelName, `Based on the following book description, write 3 short ad texts for social media (max 220 chars each).
      
      Book Title: "${title}"
      Description: "${description}"
      
      Requirements:
      1. Each text MUST start with: Новинка! «${title}»
      2. Strict length limit: 220 characters per text.
      3. Provide exactly 3 variants.
      
      Output JSON format:
      {
        "variants": ["text1", "text2", "text3"]
      }`, {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            variants: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      });
    
    const json = JSON.parse(response.text || "{}");
    return json.variants || [];
  } catch (error) {
    console.error("Gemini AdText Error:", error);
    return [];
  }
}
