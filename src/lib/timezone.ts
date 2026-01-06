// Timezone utilities for nhimbe

export interface UserTimezone {
  timezone: string;
  offset: string;
  city?: string;
  country?: string;
}

// Get user's timezone info
export function getUserTimezone(): UserTimezone {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  const offsetMinutes = -now.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const offset = `GMT${sign}${offsetHours}${offsetMins > 0 ? `:${offsetMins.toString().padStart(2, "0")}` : ""}`;

  // Extract city from timezone (e.g., "America/New_York" -> "New York")
  const parts = timezone.split("/");
  const city = parts[parts.length - 1]?.replace(/_/g, " ");

  return { timezone, offset, city };
}

// Format time for display in user's timezone
export function formatTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...options,
  });
}

// Format date for display
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...options,
  });
}

// Get relative date string (Today, Tomorrow, or date)
export function getRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1 && diffDays <= 6) {
    return d.toLocaleDateString("en-US", { weekday: "long" });
  }
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// Format event datetime for card display (e.g., "Tomorrow, 3:00 PM" or "Sat, Jan 10, 9:00 AM")
export function formatEventDateTime(dateStr: string, timeStr?: string): string {
  // Parse the date - handle various formats
  const date = new Date(dateStr);

  // If we have a time string, try to parse it
  if (timeStr) {
    const timeParts = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
    if (timeParts) {
      let hours = parseInt(timeParts[1], 10);
      const minutes = parseInt(timeParts[2] || "0", 10);
      const meridiem = timeParts[3]?.toUpperCase();

      if (meridiem === "PM" && hours < 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;

      date.setHours(hours, minutes);
    }
  }

  const relativeDate = getRelativeDate(date);
  const time = formatTime(date);

  return `${relativeDate}, ${time}`;
}

// Get current time formatted with timezone
export function getCurrentTimeWithTimezone(): string {
  const { offset } = getUserTimezone();
  const time = formatTime(new Date());
  return `${time} ${offset}`;
}

// Weather data interface
export interface WeatherData {
  temp: string;
  condition: string;
  icon: string;
}

// Fetch weather data for a city using wttr.in (free, no API key)
export async function getWeather(city: string): Promise<WeatherData | null> {
  try {
    const response = await fetch(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
      { next: { revalidate: 1800 } } // Cache for 30 mins
    );

    if (!response.ok) return null;

    const data = await response.json();
    const current = data.current_condition?.[0];

    if (!current) return null;

    const tempC = current.temp_C;
    const tempF = current.temp_F;
    const condition = current.weatherDesc?.[0]?.value || "";

    // Map weather conditions to simple icons
    const conditionLower = condition.toLowerCase();
    let icon = "sun"; // default
    if (conditionLower.includes("cloud") || conditionLower.includes("overcast")) icon = "cloud";
    if (conditionLower.includes("rain") || conditionLower.includes("drizzle")) icon = "cloud-rain";
    if (conditionLower.includes("thunder") || conditionLower.includes("storm")) icon = "cloud-lightning";
    if (conditionLower.includes("snow") || conditionLower.includes("sleet")) icon = "cloud-snow";
    if (conditionLower.includes("fog") || conditionLower.includes("mist")) icon = "cloud-fog";
    if (conditionLower.includes("clear") || conditionLower.includes("sunny")) icon = "sun";
    if (conditionLower.includes("partly")) icon = "cloud-sun";

    return {
      temp: `${tempC}°C / ${tempF}°F`,
      condition,
      icon,
    };
  } catch {
    return null;
  }
}
