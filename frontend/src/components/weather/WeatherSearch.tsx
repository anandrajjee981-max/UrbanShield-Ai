import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { DEFAULT_WEATHER_CITY } from '../../store/slices/weatherSlice';

export default function WeatherSearch({
  loading,
  onSearch,
}: {
  loading: boolean;
  onSearch: (city: string) => void;
}) {
  const [value, setValue] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  };

  return (
    <form onSubmit={submit} className="flex w-full sm:w-auto gap-2">
      <div className="relative flex-1 sm:w-64">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-mute pointer-events-none"
        />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Search city: ${DEFAULT_WEATHER_CITY}`}
          aria-label="Search city"
          disabled={loading}
          className="w-full text-sm font-semibold pl-9 pr-3 py-2.5 rounded-xl border border-line bg-card text-ink placeholder:text-mute placeholder:font-normal focus:outline-none focus:border-brand disabled:opacity-60"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="text-sm font-bold px-5 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-50 shrink-0"
      >
        Search
      </button>
    </form>
  );
}
