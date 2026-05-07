import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { downloadExcel } from '@/lib/excel';

interface ResultItem {
  originalUrl: string;
  slug: string;
  slugExc: string;
  headline: string;
  adTexts: string[];
  selectedAdIndex: number;
}

interface ResultsTableProps {
  results: ResultItem[];
  onAdSelect: (index: number, adIndex: number) => void;
}

export function ResultsTable({ results, onAdSelect }: ResultsTableProps) {
  const handleDownload = () => {
    const data = results.map(r => ({
      "URL": r.originalUrl,
      "Slug (Exc)": r.slugExc,
      "Slug": r.slug,
      "Headline": r.headline,
      "Ad Text": r.adTexts[r.selectedAdIndex] || ""
    }));
    downloadExcel(data);
  };

  if (results.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Results ({results.length})</h2>
        <Button onClick={handleDownload} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Excel
        </Button>
      </div>
      
      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 uppercase font-medium">
            <tr>
              <th className="px-4 py-3 w-1/6">URL / Slug</th>
              <th className="px-4 py-3 w-1/4">Headline</th>
              <th className="px-4 py-3 w-1/2">Ad Text Options</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {results.map((item, idx) => (
              <tr key={idx} className="bg-white hover:bg-gray-50">
                <td className="px-4 py-3 align-top space-y-2">
                  <div className="text-xs text-gray-500 truncate max-w-[200px]" title={item.originalUrl}>
                    {item.originalUrl}
                  </div>
                  <div className="font-mono text-xs bg-gray-100 p-1 rounded">
                    {item.slug}
                  </div>
                  <div className="font-mono text-xs text-blue-600">
                    {item.slugExc}
                  </div>
                </td>
                <td className="px-4 py-3 align-top font-medium">
                  {item.headline}
                </td>
                <td className="px-4 py-3 align-top space-y-2">
                  {item.adTexts.map((text, adIdx) => (
                    <label key={adIdx} className="flex items-start space-x-2 cursor-pointer p-2 rounded hover:bg-blue-50 transition-colors">
                      <input
                        type="radio"
                        name={`ad-group-${idx}`}
                        checked={item.selectedAdIndex === adIdx}
                        onChange={() => onAdSelect(idx, adIdx)}
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-800">{text}</span>
                    </label>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
