import { Injectable, LOCALE_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { formatDate } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';

export interface WeatherForecast {
  day: string;
  date: string; // Format: "12 août"
  isToday: boolean;
  icon: 'Sun' | 'Cloud' | 'CloudRain' | 'CloudSnow';
  tempMin: number;
  tempMax: number;
  description: string;
  windSpeed?: number; // km/h
  rainChance?: number; // 0-100%
}

@Injectable({ providedIn: 'root' })
export class WeatherService {
  // Use backend proxy to avoid CORS issues
  private apiUrl = 'http://localhost:8082/api/weather/forecast';

  constructor(
    private http: HttpClient,
    private transloco: TranslocoService,
    @Inject(LOCALE_ID) private locale: string
  ) {}

  /**
   * Get 5-day weather forecast for a destination based on coordinates
   * Calls backend proxy which forwards to OpenWeatherMap API
   */
  getForecast(latitude: number, longitude: number): Observable<WeatherForecast[]> {
    const url = `${this.apiUrl}?lat=${latitude}&lon=${longitude}`;
    
    console.log(`[WeatherService] Calling backend proxy for coordinates: lat=${latitude}, lon=${longitude}`);

    return this.http.get<any>(url).pipe(
      map(data => {
        console.log('[WeatherService] API response received successfully:', data);
        return this.parseOpenWeatherData(data);
      }),
      catchError(err => {
        console.error('[WeatherService] ❌ API call failed:', {
          status: err.status,
          statusText: err.statusText,
          message: err.error?.message || err.message
        });
        
        if (err.status === 401) {
          console.warn('[WeatherService] 🔑 Invalid API key configured on backend');
        } else if (err.status === 0) {
          console.warn('[WeatherService] 🔌 Backend not reachable. Is it running on port 8082?');
        }
        
        console.warn('[WeatherService] 📊 Returning mock data as fallback');
        return of(this.getMockForecast());
      })
    );
  }

  /**
   * Parse OpenWeatherMap API response to our format
   * Groups forecasts by day and calculates min/max temperatures
   */
  private parseOpenWeatherData(data: any): WeatherForecast[] {
    if (!data.list || data.list.length === 0) {
      console.warn('[WeatherService] No forecast data in API response');
      return this.getMockForecast();
    }

    // Group forecasts by date
    const forecastsByDate = new Map<string, any[]>();
    
    for (const item of data.list) {
      const date = item.dt_txt.split(' ')[0]; // YYYY-MM-DD
      if (!forecastsByDate.has(date)) {
        forecastsByDate.set(date, []);
      }
      forecastsByDate.get(date)!.push(item);
    }

    const forecasts: WeatherForecast[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Process each day
    for (const [date, items] of forecastsByDate.entries()) {
      if (forecasts.length >= 5) break;

      // Calculate min/max temperatures for the day
      const temps = items.map(item => item.main.temp);
      const tempMin = Math.round(Math.min(...temps));
      const tempMax = Math.round(Math.max(...temps));

      // Get most common weather condition (mode of weather.main)
      const weatherCounts = new Map<string, number>();
      items.forEach(item => {
        const weather = item.weather[0].main;
        weatherCounts.set(weather, (weatherCounts.get(weather) || 0) + 1);
      });
      const dominantWeather = [...weatherCounts.entries()].reduce((a, b) => a[1] > b[1] ? a : b)[0];
      
      // Get description from noon forecast or first available
      const noonForecast = items.find(item => item.dt_txt.includes('12:00:00')) || items[0];
      const description = noonForecast.weather[0].description;

      // Wind speed (average of the day, convert m/s to km/h)
      const windSpeeds = items.map(item => item.wind.speed * 3.6); // m/s → km/h
      const avgWindSpeed = Math.round(windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length);

      // Rain chance (max probability of precipitation for the day)
      const rainChances = items.map(item => (item.pop || 0) * 100); // pop = probability of precipitation (0-1)
      const maxRainChance = Math.round(Math.max(...rainChances));

      // Date formatting using locale-aware Angular DatePipe
      const dateObj = new Date(date + 'T12:00:00');
      const dayName = formatDate(dateObj, 'EEE', this.locale); // Short day name (Mon, Tue...)
      const dateFormatted = formatDate(dateObj, 'd MMM', this.locale); // Day + short month (4 Aug)

      forecasts.push({
        day: dayName,
        date: dateFormatted,
        isToday: date === today,
        icon: this.mapWeatherIcon(dominantWeather),
        tempMin: tempMin,
        tempMax: tempMax,
        description: description,
        windSpeed: avgWindSpeed > 0 ? avgWindSpeed : undefined,
        rainChance: maxRainChance > 0 ? maxRainChance : undefined
      });
    }

    console.log(`[WeatherService] ✅ Parsed ${forecasts.length} days of forecast:`, forecasts);
    return forecasts.length > 0 ? forecasts : this.getMockForecast();
  }

  /**
   * Map OpenWeatherMap weather condition to our icon names
   */
  private mapWeatherIcon(weatherMain: string): 'Sun' | 'Cloud' | 'CloudRain' | 'CloudSnow' {
    const main = weatherMain.toLowerCase();
    
    if (main.includes('clear')) return 'Sun';
    if (main.includes('rain') || main.includes('drizzle') || main.includes('thunderstorm')) return 'CloudRain';
    if (main.includes('snow')) return 'CloudSnow';
    return 'Cloud'; // Clouds, Mist, Fog, etc.
  }

  /**
   * Fallback mock data when API is not available
   */
  private getMockForecast(): WeatherForecast[] {
    const today = new Date();
    
    return Array.from({ length: 5 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      return {
        day: formatDate(date, 'EEE', this.locale),
        date: formatDate(date, 'd MMM', this.locale),
        isToday: i === 0,
        icon: i % 3 === 0 ? 'Sun' : i % 3 === 1 ? 'Cloud' : 'CloudRain' as any,
        tempMin: 18 + i,
        tempMax: 28 + i,
        description: this.transloco.translate('destination.weatherUnavailable'),
        windSpeed: 15 + i * 2,
        rainChance: i === 3 ? 30 : undefined
      };
    });
  }
}
