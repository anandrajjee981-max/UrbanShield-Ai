import { Info, RotateCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import AISearchForecast from './AISearchForecast';
import type { AiChatData } from '../../services/aiAssistant';

/** One rendered turn in the assistant conversation. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Structured answer attached to a successful assistant turn. */
  data?: AiChatData;
  /** True when this assistant turn represents a failed request. */
  isError?: boolean;
}

/** Renders one conversation turn: a user bubble or an assistant answer (with forecast). */
export default function AISearchMessage({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry: () => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white">
          {message.text}
        </p>
      </div>
    );
  }

  const data = message.data;
  const hasForecast = Boolean(data && data.forecast.length > 0);

  return (
    <div className="flex flex-col items-start gap-2">
      <div
        className={`max-w-[92%] rounded-2xl rounded-bl-md border px-3.5 py-2.5 text-[13px] leading-relaxed ${
          message.isError ? 'border-line bg-canvas text-soft' : 'border-line bg-canvas text-ink'
        }`}
      >
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-brand">
          {message.isError ? (
            <TriangleAlert size={12} aria-hidden />
          ) : (
            <ShieldCheck size={12} aria-hidden />
          )}
          UrbanShield AI
        </div>
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>

      {message.isError && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-canvas px-3 py-1.5 text-[11px] font-bold text-brand transition-colors hover:border-brand"
        >
          <RotateCw size={12} aria-hidden />
          Try again
        </button>
      )}

      {hasForecast && data && (
        <div className="w-full max-w-[92%]">
          <AISearchForecast days={data.forecast} location={data.location?.label ?? null} />
        </div>
      )}

      {data && (data.dataSources.length > 0 || data.limitations.length > 0) && (
        <div className="max-w-[92%] rounded-xl bg-cream px-3 py-2">
          {data.dataSources.length > 0 && (
            <p className="flex items-start gap-1.5 text-[10px] font-semibold text-mute">
              <Info size={11} className="mt-0.5 shrink-0" aria-hidden />
              <span>Sources: {data.dataSources.join(' · ')}</span>
            </p>
          )}
          {data.limitations.map((note) => (
            <p key={note} className="mt-1 flex items-start gap-1.5 text-[10px] font-semibold text-mute">
              <TriangleAlert size={11} className="mt-0.5 shrink-0 text-brand" aria-hidden />
              <span>{note}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
