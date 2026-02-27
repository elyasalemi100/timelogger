'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function PhotoViewer({ path, onClose }: { path: string; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const bucket = 'shift-photos';
    supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="max-w-2xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
        {url ? (
          <img src={url} alt="Shift photo" className="max-w-full max-h-[85vh] rounded-lg" />
        ) : (
          <div className="text-white">Loading...</div>
        )}
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-white/20 text-white rounded-lg hover:bg-white/30"
        >
          Close
        </button>
      </div>
    </div>
  );
}
