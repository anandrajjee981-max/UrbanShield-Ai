import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, ClipboardList, FileText, Info } from 'lucide-react';
import type { AiSearchResultItem } from '../../services/aiSearchMock';

const KIND_META = {
  issue: { icon: FileText, label: 'Issue' },
  task: { icon: ClipboardList, label: 'Task' },
  authority: { icon: Building2, label: 'Authority' },
  info: { icon: Info, label: 'Record' },
} as const;

function ResultCard({ item, onNavigate }: { item: AiSearchResultItem; onNavigate: () => void }) {
  const navigate = useNavigate();
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;

  return (
    <article className="rounded-2xl border border-line bg-canvas p-3.5 transition-colors hover:border-brand">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Icon size={15} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-extrabold">{item.id}</p>
          <p className="truncate text-[11px] font-semibold text-mute">
            {meta.label} · {item.category}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand">
          {item.status}
        </span>
      </div>
      <p className="mt-2 truncate text-[13px] font-semibold text-soft">{item.title}</p>
      <p className="truncate text-[11px] text-mute">
        {item.location} · {item.createdAt}
      </p>
      <button
        type="button"
        onClick={() => {
          navigate(item.to);
          onNavigate();
        }}
        className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-brand transition-transform hover:translate-x-0.5"
      >
        {item.ctaLabel} <ArrowRight size={13} aria-hidden />
      </button>
    </article>
  );
}

interface Props {
  summary: string;
  items: AiSearchResultItem[];
  onNavigate: () => void;
  onClear: () => void;
}

/**
 * Demo result list. Every card links to an EXISTING frontend route —
 * no new routes are introduced.
 */
export default function AISearchResults({ summary, items, onNavigate, onClear }: Props) {
  return (
    <div>
      <div className="mb-2.5 rounded-xl bg-brand-soft px-3.5 py-2.5">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand">AI Result · demo data</p>
        <p className="mt-0.5 text-[13px] font-semibold text-ink">{summary}</p>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <ResultCard key={`${item.kind}-${item.id}`} item={item} onNavigate={onNavigate} />
        ))}
      </div>
      <button
        type="button"
        onClick={onClear}
        className="mt-2.5 w-full rounded-xl px-3 py-2 text-center text-xs font-bold text-mute transition-colors hover:bg-canvas hover:text-brand"
      >
        Start a new search
      </button>
    </div>
  );
}
