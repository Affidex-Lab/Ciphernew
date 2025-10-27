import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function normalizeUrl(input: string): string {
  const s = (input || '').trim();
  if (!s) return '';
  try {
    // If already starts with http/https, trust it
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      return u.toString();
    }
    // If it looks like a domain, prefix https://
    const u = new URL('https://' + s);
    return u.toString();
  } catch {
    return '';
  }
}

export default function Browser() {
  const [urlInput, setUrlInput] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const go = () => {
    const u = normalizeUrl(urlInput);
    if (u) setUrl(u);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get('url');
    if (initial) {
      const u = normalizeUrl(initial);
      if (u) {
        setUrlInput(u);
        setUrl(u);
      }
    }
  }, []);

  const pairFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const uri = (text || '').trim();
      if (uri.startsWith('wc:')) {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'wc-uri', uri }, window.location.origin);
        }
      } else {
        alert('Clipboard does not contain a WalletConnect URI');
      }
    } catch (e) {
      alert('Could not read clipboard');
    }
  };

  const copyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(url || urlInput || '');
    } catch {}
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="w-full border-b p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') go(); }}
            placeholder="https://app.uniswap.org"
          />
          <Button onClick={go}>Go</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={pairFromClipboard}>Pair from clipboard</Button>
          <Button variant="outline" onClick={copyCurrentUrl}>Copy current URL</Button>
        </div>
      </div>
      <div className="w-full" style={{ height: 'calc(100vh - 110px)' }}>
        <iframe
          ref={iframeRef}
          title="dApp Browser"
          src={url || 'about:blank'}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          allow="clipboard-read; clipboard-write; autoplay; encrypted-media; picture-in-picture; accelerometer; midi; geolocation; payment; microphone; camera; display-capture; web-share"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}
