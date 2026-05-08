import React, { useState } from 'react';
import { InputArea } from '@/components/InputArea';
import { ResultsTable } from '@/components/ResultsTable';
import { processFeed } from '@/services/api';
import { generateBookAssets } from '@/services/gemini';
import { Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [model, setModel] = useState("gemini-3.1-pro-preview");
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async (urls: string[]) => {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      // 1. Fetch feed data
      const feedItems = await processFeed(urls);
      
      if (feedItems.length === 0) {
        setError("No matching items found in the feed.");
        setLoading(false);
        return;
      }

      // 2. Process with Gemini sequentially to respect API rate limits
      const processedItems: any[] = [];
      for (let i = 0; i < feedItems.length; i++) {
        const item = feedItems[i];
        
        try {
          const assets = await generateBookAssets(item.feedUrl, item.name, item.description, model);
          
          if (assets) {
            processedItems.push({
              originalUrl: item.originalUrl,
              slug: assets.slug || "missing_slug",
              slugExc: `product_exc_${assets.slug || "missing_slug"}`,
              headline: assets.headline || "Missing headline",
              adTexts: assets.adTexts && assets.adTexts.length > 0 ? assets.adTexts : ["Failed to generate ad text."],
              selectedAdIndex: 0
            });
          } else {
            processedItems.push({
              originalUrl: item.originalUrl,
              slug: "api_error",
              slugExc: "api_error",
              headline: "API limits reached",
              adTexts: ["Failed to generate content due to Gemini API limits or error. Please check your API key or quota in Vercel settings."],
              selectedAdIndex: 0
            });
          }
          
          // Update UI immediately with partial results
          setResults([...processedItems]);
          
          // Delay to prevent hitting 15 RPM / quota limits (Google Gen AI Free Tier limit)
          if (i < feedItems.length - 1) {
            await new Promise(res => setTimeout(res, 5000));
          }
          
        } catch (e: any) {
          console.error("Error processing item:", item.originalUrl, e);
          processedItems.push({
            originalUrl: item.originalUrl,
            slug: "Error",
            slugExc: "Error",
            headline: "Error",
            adTexts: [e?.message || "Error generating content"],
            selectedAdIndex: 0
          });
          setResults([...processedItems]);
        }
      }

    } catch (err: any) {
      setError(err.message || "An error occurred while processing.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdSelect = (index: number, adIndex: number) => {
    const newResults = [...results];
    newResults[index].selectedAdIndex = adIndex;
    setResults(newResults);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center pb-6 border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Book Feed Ad Generator</h1>
            <p className="text-gray-500 mt-1">Generate marketing assets from product URLs using Gemini AI.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white p-2 rounded-md border shadow-sm">
              <Settings className="h-4 w-4 text-gray-500" />
              <select 
                value={model} 
                onChange={(e) => setModel(e.target.value)}
                className="text-sm border-none focus:ring-0 text-gray-700 bg-transparent cursor-pointer"
              >
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
              </select>
            </div>
          </div>
        </header>

        <main className="space-y-8">
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <InputArea onProcess={handleProcess} loading={loading} />
            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
          </section>

          {results.length > 0 && (
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <ResultsTable results={results} onAdSelect={handleAdSelect} />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
