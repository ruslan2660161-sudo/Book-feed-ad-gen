import express from "express";
import { createServer as createViteServer } from "vite";
import sax from "sax";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/process-feed", async (req, res) => {
    try {
      const { urls } = req.body;
      if (!urls || !Array.isArray(urls)) {
        res.status(400).json({ error: "Invalid input: urls must be an array" });
        return;
      }

      // Normalize requested URLs to remove query params for matching
      const requestedUrlMap = new Map<string, string>();
      urls.forEach((url: string) => {
        try {
          const u = new URL(url);
          // Key is normalized URL (origin + pathname), Value is original requested URL
          requestedUrlMap.set(u.origin + u.pathname, url);
        } catch (e) {
          // If invalid URL, ignore or use as is
          requestedUrlMap.set(url, url);
        }
      });

      console.log(`Processing ${urls.length} URLs...`);

      const response = await axios.get('https://feeds-cdn.cgorod.pw/feeds/VKBooks.xml', {
        responseType: 'stream'
      });

      const saxStream = sax.createStream(false, { trim: true, normalize: true });
      
      const results: any[] = [];
      let currentTag = "";
      let currentItem: any = {};
      let isOffer = false;
      let textBuffer = "";

      saxStream.on("opentag", (node) => {
        currentTag = node.name;
        if (node.name === "offer" || node.name === "OFFER") {
          isOffer = true;
          currentItem = {};
        }
        textBuffer = "";
      });

      saxStream.on("text", (text) => {
        if (isOffer && currentTag) {
          textBuffer += text;
        }
      });

      saxStream.on("closetag", (tagName) => {
        if (isOffer && currentTag) {
            // Assign accumulated text to current property
            // Handle multiple text nodes if necessary, but simple assignment is usually enough for simple XML
            currentItem[currentTag.toLowerCase()] = textBuffer;
        }

        if (tagName === "offer" || tagName === "OFFER") {
          isOffer = false;
          // Check if this offer matches one of our requested URLs
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
                // Optimization: If we found all requested URLs, we could stop stream.
                // But since we might have duplicates or want to be thorough, let's continue.
                // Or stop if results.length === requestedUrlMap.size
                if (results.length >= requestedUrlMap.size) {
                    // Optional: destroy stream to stop processing
                    // response.data.destroy();
                }
              }
            } catch (e) {
              // Ignore invalid URLs in feed
            }
          }
        }
        currentTag = "";
        textBuffer = "";
      });

      saxStream.on("error", function (this: any, e) {
        console.error("XML Parse Error:", e.message);
        // Resume on error to try to continue
        this._parser.error = null;
        this._parser.resume();
      });

      saxStream.on("end", () => {
        console.log(`Found ${results.length} matches.`);
        res.json({ results });
      });

      response.data.pipe(saxStream);

    } catch (error) {
      console.error("Feed processing error:", error);
      res.status(500).json({ error: "Failed to process feed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
