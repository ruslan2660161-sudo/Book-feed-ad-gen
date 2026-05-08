import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAi() {
  if (!ai) {
    const key = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("API ключ Gemini не найден. Укажите GEMINI_API_KEY (или VITE_GEMINI_API_KEY) в настройках Vercel.");
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

const FALLBACK_MODEL = "gemini-3-flash-preview";

async function generateContentWithFallback(modelName: string, contents: any, config: any = {}) {
  try {
    const client = getAi();
    const response = await client.models.generateContent({
      model: modelName,
      contents,
      config
    });
    return response;
  } catch (error: any) {
    // Check for quota/limit errors or general failures
    if (modelName !== FALLBACK_MODEL && (error.status === 429 || error.message?.includes("quota") || error.message?.includes("limit"))) {
      console.warn(`Model ${modelName} failed, falling back to ${FALLBACK_MODEL}`);
      const clientFallback = getAi();
      return await clientFallback.models.generateContent({
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

export async function generateBookAssets(url: string, title: string, description: string, modelName: string = "gemini-3.1-pro-preview") {
  try {
    // Truncate description if it's too long (e.g. giant HTML blobs)
    let safeDescription = description || "";
    // Very basic HTML strip to save tokens
    safeDescription = safeDescription.replace(/<[^>]*>?/gm, '');
    if (safeDescription.length > 4000) {
        safeDescription = safeDescription.substring(0, 4000) + '...';
    }

    const response = await generateContentWithFallback(modelName, `Analyze the following book details and generate marketing assets.
      
Book URL: "${url}"
Book Title: "${title}"
Description: "${safeDescription}"

Requirements:
1. "slug": Extract the book title from the URL string. Exclude domain and ID. Convert it strictly to Latin characters (transliterate), keep hyphens. Limit to 40 characters.
2. "headline": Always start with exactly "Новинка!" followed by book title in quotes «...». Example: Новинка! «Название».
3. "adTexts": Provide exactly 3 separate variants of short social media ad texts based on the description (max 220 chars each). Each variant MUST start with exactly: Новинка! «${title}».

Output JSON strictly adhering to schema.`, {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            slug: { type: Type.STRING },
            headline: { type: Type.STRING },
            adTexts: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      });
    
    const json = JSON.parse(response.text || "{}");
    return {
      slug: json.slug || "",
      headline: json.headline || "",
      adTexts: Array.isArray(json.adTexts) ? json.adTexts : []
    };
  } catch (error) {
    console.error("Gemini Asset Gen Error:", error);
    return null;
  }
}

