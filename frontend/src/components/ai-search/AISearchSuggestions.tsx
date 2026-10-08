import { Sparkles } from 'lucide-react';

interface Props {
  suggestions: string[];
  disabled: boolean;
  onPick: (suggestion: string) => void;
}

/**
 * Role-aware suggested searches. UI-only: changes the suggested prompts,
 * never any authorization logic.
 */
export default function AISearchSuggestions({ suggestions, disabled, onPick }: Props) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-mute">
        <Sparkles size={12} className="text-brand" aria-hidden />
        Suggested searches
      </p>
      <ul className="space-y-1.5">
        {suggestions.map((s) => (
          <li key={s}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(s)}
              className="block w-full truncate rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-left text-[13px] font-semibold text-soft transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:text-soft"
            >
              • {s}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
