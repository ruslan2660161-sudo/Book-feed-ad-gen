import sax from "sax";
import axios from "axios";

// Allow execution to run up to maximum allowed duration to parse large feeds
export const maxDuration = 60; 

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: "Invalid input: urls must be an array" });
    }

    // Normalize requested URLs
    const requestedUrlMap = new Map<string, string>();
    urls.forEach((url: string) => {
      try {
        const u = new URL(url);
        requestedUrlMap.set(u.origin + u.pathname, url);
      } catch (e) {
        requestedUrlMap.set(url, url);
      }
    });

    console.log(`Processing ${urls.length} URLs via Vercel Function...`);

    const response = await axios.get('https://feeds-cdn.cgorod.pw/feeds/VKBooks.xml', {
      responseType: 'stream'
    });

    const saxStream = sax.createStream(false, { trim: true, normalize: true });
    
    const results: any[] = [];
    let currentTag = "";
    let currentItem: any = {};
    let isOffer = false;
    let textBuffer = "";

    saxStream.on("opentag", (node: any) => {
      currentTag = node.name;
      if (node.name === "offer" || node.name === "OFFER") {
        isOffer = true;
        currentItem = {};
      }
      textBuffer = "";
    });

    saxStream.on("text", (text: string) => {
      if (isOffer && currentTag) {
        textBuffer += text;
      }
    });

    saxStream.on("closetag", (tagName: string) => {
      if (isOffer && currentTag) {
          currentItem[currentTag.toLowerCase()] = textBuffer;
      }

      if (tagName === "offer" || tagName === "OFFER") {
        isOffer = false;
        if (currentItem.url) {
          try {
            const u = new URL(currentItem.url);
            const normalizedItemUrl = u.origin + u.pathname;
            
            if (requestedUrlMap.has(normalizedItemUrl)) {
              const originalUrl = requestedUrlMap.get(normalizedItemUrl);
              results.push({
                originalUrl: originalUrl,
                feedUrl: currentItem.url,
                name: currentItem.name || currentItem.model || "Unknown Title",
                description: currentItem.description || "",
                author: currentItem.author || ""
              });
            }
          } catch (e) {}
        }
      }
      currentTag = "";
      textBuffer = "";
    });

    saxStream.on("error", function (this: any, e: any) {
      console.error("XML Parse Error:", e.message);
      this._parser.error = null;
      this._parser.resume();
    });

    saxStream.on("end", () => {
      console.log(`Found ${results.length} matches.`);
      res.status(200).json({ results });
    });

    response.data.pipe(saxStream);

  } catch (error) {
    console.error("Feed processing error:", error);
    res.status(500).json({ error: "Failed to process feed" });
  }
}
