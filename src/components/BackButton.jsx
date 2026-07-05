import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ onClick, label = 'Back', style = {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="back-button"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--secondary, rgba(255,255,255,0.06))',
        color: 'var(--foreground, #E6EDF3)',
        border: '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: 'var(--radius, 10px)',
        padding: '8px 14px',
        fontWeight: 600,
        fontSize: 14,
        cursor: 'pointer',
        transition: 'background 0.2s, transform 0.15s',
        ...style,
      }}
      onMouseOver={(e) => (e.currentTarget.style.background = 'var(--primary, #5865F2)')}
      onMouseOut={(e) => (e.currentTarget.style.background = style.background || 'var(--secondary, rgba(255,255,255,0.06))')}
      aria-label={label}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}
