import { TrendingUp, TrendingDown } from 'lucide-react';
import Card from '../common/Card';
import type { DashboardKpi } from '../../types';

export default function KpiCard({ kpi }: { kpi: DashboardKpi }) {
  const up = kpi.delta >= 0;
  return (
    <Card className="gs-in p-5">
      <p className="text-sm font-medium text-soft truncate">{kpi.label}</p>
      <p className="text-2xl sm:text-3xl font-extrabold mt-1 truncate">{kpi.value}{kpi.unit && <span className="text-base font-bold text-soft"> {kpi.unit}</span>}</p>
      <p className={`flex items-center gap-1 text-xs font-semibold mt-2 ${up ? 'text-civic-green' : 'text-brand'}`}>
        {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{Math.abs(kpi.delta)}% vs yesterday
      </p>
    </Card>
  );
}
