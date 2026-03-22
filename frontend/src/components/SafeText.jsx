import React from 'react';

/**
 * A security-first component for rendering untrusted text with basic formatting.
 * Safely converts line breaks to <br/> and handles bolding while neutralizing
 * all other HTML tags and script injection vectors.
 */
export default function SafeText({ text, className }) {
  if (!text) return null;

  // 1. Sanitize: Remove all HTML tags completely
  const sanitized = text.replace(/<[^>]*>?/gm, '');

  // 2. Process basic formatting (bolding and line breaks)
  const parts = sanitized.split(/(\*\*.*?\*\*|\n)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Bold part: **text**
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    } else if (part === '\n') {
      // Line break
      return <br key={index} />;
    }
    // Regular text
    return part;
  });

  return <div className={className}>{parts}</div>;
}
