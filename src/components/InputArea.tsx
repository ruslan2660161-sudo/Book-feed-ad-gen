import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface InputAreaProps {
  onProcess: (urls: string[]) => void;
  loading: boolean;
}

export function InputArea({ onProcess, loading }: InputAreaProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const urls = text.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    if (urls.length > 0) {
      onProcess(urls);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="urls" className="text-sm font-medium text-gray-700">
          Paste Book URLs (one per line)
        </label>
        <textarea
          id="urls"
          className="w-full min-h-[200px] p-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono text-sm"
          placeholder="https://www.chitai-gorod.ru/product/..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={loading || !text.trim()} className="w-full sm:w-auto">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Process URLs'
          )}
        </Button>
      </div>
    </form>
  );
}
