"use client";
import { useEffect, useState } from "react";
import { Cloud } from "lucide-react";
import { getWeather, weatherCodeMap, WeatherResponse } from "@/lib/weather";

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherResponse | null>(null);

  useEffect(() => {
    getWeather().then(setWeather).catch(() => setWeather(null));
  }, []);

  return (
    <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center gap-2 text-neutral-400 mb-2">
        <Cloud size={16} />
        <span className="text-xs font-medium uppercase tracking-wide">Weather</span>
      </div>
      {!weather ? (
        <p className="text-neutral-600 text-sm">Loading...</p>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">
              {weatherCodeMap[weather.current.weather_code]?.emoji || "—"}
            </span>
            <span className="text-xl font-semibold">
              {Math.round(weather.current.temperature_2m)}°C
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {weather.daily.time.slice(0, 4).map((day: string, i: number) => (
              <div key={day} className="flex flex-col items-center min-w-[2.5rem]">
                <span className="text-[10px] text-neutral-500">
                  {new Date(day).toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <span className="text-sm">
                  {weatherCodeMap[weather.daily.weather_code[i]]?.emoji || "—"}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {Math.round(weather.daily.temperature_2m_max[i])}°
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
