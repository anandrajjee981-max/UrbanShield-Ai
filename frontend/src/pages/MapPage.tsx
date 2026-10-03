import { useEffect } from 'react';
import CityMap from '../components/map/CityMap';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchMapData } from '../store/slices/mapSlice';

export default function MapPage() {
  const dispatch = useAppDispatch();
  const zones = useAppSelector((s) => s.map.zones);
  useEffect(() => { dispatch(fetchMapData()); }, [dispatch]);
  return (
    <div className="space-y-3">
      <div><h1 className="text-xl sm:text-2xl font-extrabold">Live City Map</h1><p className="text-xs sm:text-sm text-mute">Real OpenStreetMap tiles · {zones.length} risk zones · search, locate, layers & filters</p></div>
      <CityMap />
    </div>
  );
}
