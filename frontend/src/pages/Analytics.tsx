import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { fetchAnalytics } from '../store/slices/analyticsSlice';
import AnalyticsCharts from '../components/analytics/AnalyticsCharts';

export default function Analytics() {
  const dispatch = useAppDispatch();
  useEffect(() => { dispatch(fetchAnalytics()); }, [dispatch]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-extrabold">Risk Analytics</h1>
      <AnalyticsCharts />
    </div>
  );
}
