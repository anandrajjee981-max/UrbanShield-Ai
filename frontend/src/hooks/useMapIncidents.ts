import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { backendIssueToMapIncident } from '../store/slices/mapSlice';
import type { Incident } from '../types';

/**
 * All map markers in one place: mock incidents + live backend markers
 * (own reports + all city reports), de-duplicated by id.
 * Shared by CityMap and the nearby-live-location panel.
 */
export function useMapIncidents(): { allIncidents: Incident[]; liveIds: Set<string> } {
  const incidents = useAppSelector((s) => s.map.incidents);
  const realIncidents = useAppSelector((s) => s.map.realIncidents);
  const browse = useAppSelector((s) => s.workflow.browse);

  return useMemo(() => {
    const live = browse
      .map((b) => backendIssueToMapIncident(b, `Citizen report · ${b.citizen.name}`))
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const merged = new Map([...incidents, ...realIncidents, ...live].map((i) => [i.id, i]));
    return {
      allIncidents: [...merged.values()],
      liveIds: new Set([...realIncidents.map((i) => i.id), ...live.map((i) => i.id)]),
    };
  }, [incidents, realIncidents, browse]);
}
