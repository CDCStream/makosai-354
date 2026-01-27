'use client';

import { useMemo } from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';

interface LatexRendererProps {
  text: string;
  className?: string;
}

export function LatexRenderer({ text, className = '' }: LatexRendererProps) {
  const renderedContent = useMemo(() => {
    if (!text) return '';

    // Replace display math ($$...$$) first
    let result = text.replace(/\$\$(.*?)\$\$/g, (match, latex) => {
      try {
        return katex.renderToString(latex, {
          displayMode: true,
          throwOnError: false,
          output: 'html',
        });
      } catch (e) {
        console.error('KaTeX display error:', e);
        return match;
      }
    });

    // Replace inline math ($...$)
    result = result.replace(/\$([^$]+)\$/g, (match, latex) => {
      try {
        return katex.renderToString(latex, {
          displayMode: false,
          throwOnError: false,
          output: 'html',
        });
      } catch (e) {
        console.error('KaTeX inline error:', e);
        return match;
      }
    });

    return result;
  }, [text]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}

// Simple component for just displaying math
interface MathProps {
  children: string;
  display?: boolean;
}

export function Math({ children, display = false }: MathProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(children, {
        displayMode: display,
        throwOnError: false,
        output: 'html',
      });
    } catch (e) {
      console.error('KaTeX error:', e);
      return children;
    }
  }, [children, display]);

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

