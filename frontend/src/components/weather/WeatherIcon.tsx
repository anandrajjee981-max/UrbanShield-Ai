import { weatherIconUrl } from '../../services/weatherService';

export default function WeatherIcon({
  icon,
  condition,
  size = 64,
}: {
  icon: string;
  condition: string;
  size?: number;
}) {
  return (
    <img
      src={weatherIconUrl(icon)}
      alt={condition}
      width={size}
      height={size}
      loading="lazy"
      className="shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
