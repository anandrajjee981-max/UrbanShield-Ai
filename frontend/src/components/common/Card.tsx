import type { ReactNode } from 'react';

export default function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-card border border-line rounded-2xl shadow-sm ${className}`}>{children}</div>;
}
