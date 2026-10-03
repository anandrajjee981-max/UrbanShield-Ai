import { Bot, Sparkles, TriangleAlert } from 'lucide-react';
import Card from '../common/Card';

const insights = [
  { title: 'Flood risk rising near Yamuna East', desc: 'Rainfall + river discharge models predict a 72% chance of waterlogging in the next 6 hours. Pre-deploy pumps at ITO and Lajpat Nagar.', level: 'critical' },
  { title: 'Heatwave mitigation', desc: 'Karol Bagh / Chandni Chowk corridor will exceed 43°C until 6pm. Open 4 additional cooling centers and push SMS advisory.', level: 'high' },
  { title: 'Air quality drift', desc: 'Anand Vihar PM2.5 expected to fall 15% overnight as winds pick up. No intervention needed.', level: 'info' },
];

export default function AiPanel() {
  return (
    <div className="space-y-4">
      <Card className="gs-in p-5 bg-gradient-to-r from-brand to-brand-warm border-0! text-white">
        <div className="flex items-center gap-2 font-bold"><Bot size={20} /> UrbanShield AI Engine</div>
        <p className="text-sm text-white/85 mt-1">Frontend demo of AI-generated advisories. Connect to a real inference API later via the service layer.</p>
      </Card>
      {insights.map((i) => (
        <Card key={i.title} className="gs-in p-5">
          <div className="flex items-start gap-2 font-bold text-sm">
            {i.level === 'critical' ? <TriangleAlert size={16} className="text-brand shrink-0 mt-0.5" /> : <Sparkles size={16} className="text-civic-amber-dark shrink-0 mt-0.5" />}
            <span className="min-w-0 break-words">{i.title}</span>
          </div>
          <p className="text-sm text-soft mt-2 break-words">{i.desc}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="text-xs font-bold px-3 py-2 rounded-lg bg-cream text-civic-amber-dark">View reasoning</button>
            <button className="text-xs font-bold px-3 py-2 rounded-lg bg-brand text-white">Dispatch action</button>
          </div>
        </Card>
      ))}
    </div>
  );
}
