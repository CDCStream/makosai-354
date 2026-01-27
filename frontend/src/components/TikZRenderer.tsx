'use client';

import { useEffect, useRef, useState } from 'react';

interface TikZRendererProps {
  code: string;
  className?: string;
}

export function TikZRenderer({ code, className = '' }: TikZRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !code || rendered) return;

    // Find and process with TikZJax
    const processWithTikzjax = () => {
      const scripts = containerRef.current?.querySelectorAll('script[type="text/tikz"]');
      if (scripts && scripts.length > 0) {
        // TikZJax should auto-process, but we need to trigger it for dynamic content
        // Dispatch a custom event that TikZJax might listen to
        document.dispatchEvent(new Event('tikzjax-load-fonts'));

        // Also try to find and call the global processer
        const tikzScripts = document.querySelectorAll('script[type="text/tikz"]:not([data-processed])');
        tikzScripts.forEach((script) => {
          script.setAttribute('data-processed', 'true');
        });
      }
      setRendered(true);
    };

    // Wait for TikZJax to be ready
    const timer = setTimeout(processWithTikzjax, 500);
    return () => clearTimeout(timer);
  }, [code, rendered]);

  // Reset rendered state when code changes
  useEffect(() => {
    setRendered(false);
  }, [code]);

  if (!code) return null;

  // Render TikZ code as a script element that TikZJax will process
  return (
    <div
      ref={containerRef}
      className={`tikz-container flex justify-center items-center my-4 ${className}`}
      dangerouslySetInnerHTML={{
        __html: `<script type="text/tikz">${code}</script>`
      }}
    />
  );
}

export default TikZRenderer;

