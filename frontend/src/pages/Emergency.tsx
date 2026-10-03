import EmergencyPanel from '../components/emergency/EmergencyPanel';

export default function Emergency() {
  return (
    <div className="space-y-4 w-full max-w-3xl">
      <h1 className="text-xl sm:text-2xl font-extrabold">Emergency Response</h1>
      <EmergencyPanel />
    </div>
  );
}
