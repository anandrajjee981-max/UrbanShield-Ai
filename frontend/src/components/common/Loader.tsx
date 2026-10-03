export default function Loader({ label = 'Loading…' }: { label?: string }) {
  return <div className="flex items-center gap-2 text-sm text-mute"><span className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />{label}</div>;
}
