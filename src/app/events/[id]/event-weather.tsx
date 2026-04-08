"use client";

import { useEffect, useState } from "react";
import { Sun, Cloud, CloudRain, CloudLightning, CloudSnow, CloudFog, CloudSun, Loader2 } from "lucide-react";
import { getWeather, type WeatherData } from "@/lib/timezone";

interface EventWeatherProps {
  city: string;
  eventDate: string;
}

const weatherIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  sun: Sun,
  cloud: Cloud,
  "cloud-rain": CloudRain,
  "cloud-lightning": CloudLightning,
  "cloud-snow": CloudSnow,
  "cloud-fog": CloudFog,
  "cloud-sun": CloudSun,
};

export function EventWeather({ city, eventDate }: EventWeatherProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchWeather() {
      if (!city || city === "Online") {
        setLoading(false);
        return;
      }

      try {
        const data = await getWeather(city);
        setWeather(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
  }, [city]);

  // Check if event is in the future (weather forecast only useful for near-term events)
  const eventDateObj = new Date(eventDate);
  const now = new Date();
  const daysUntilEvent = Math.ceil((eventDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isNearFuture = daysUntilEvent >= 0 && daysUntilEvent <= 7;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-tertiary">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading weather...</span>
      </div>
    );
  }

  if (error || !weather) {
    return <div className="text-sm text-text-tertiary py-2">Weather information unavailable for this location.</div>;
  }

  const WeatherIcon = weatherIcons[weather.icon] || Sun;

  return (
    <div
      className="rounded-xl p-4 flex items-center gap-4"
      style={{ backgroundColor: "var(--event-surface)" }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
      >
        <span style={{ color: "var(--event-primary)" }}>
          <WeatherIcon className="w-6 h-6" />
        </span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{ color: "var(--event-primary)" }}>
            {weather.temp}
          </span>
          <span className="text-sm text-foreground/60">in {city}</span>
        </div>
        <p className="text-sm text-foreground/60">{weather.condition}</p>
        {!isNearFuture && (
          <p className="text-xs text-foreground/40 mt-1">
            Current conditions — forecast may change
          </p>
        )}
      </div>
    </div>
  );
}
