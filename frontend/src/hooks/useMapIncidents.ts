import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { backendIssueToMapIncident } from '../store/slices/mapSlice';
import type { Incident } from '../types';

/**
 * All map markers in one place: live backend markers (own reports + the
 * authority review queue), de-duplicated by id. Shared by CityMap and the
 * nearby-live-location panel. Only GPS-pinned issues appear — MANUAL
 * addresses have no coordinates worth pinning.
 */
export function useMapIncidents(): { allIncidents: Incident[]; liveIds: Set<string> } {
  const realIncidents = useAppSelector((s) => s.map.realIncidents);
  const tasks = useAppSelector((s) => s.workflow.tasks);

  return useMemo(() => {
    const live = tasks
      .map((b) => backendIssueToMapIncident(b, 'City report'))
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const merged = new Map([...realIncidents, ...live].map((i) => [i.id, i]));
    return {
      allIncidents: [...merged.values()],
      liveIds: new Set([...realIncidents.map((i) => i.id), ...live.map((i) => i.id)]),
    };
  }, [realIncidents, tasks]);
}
