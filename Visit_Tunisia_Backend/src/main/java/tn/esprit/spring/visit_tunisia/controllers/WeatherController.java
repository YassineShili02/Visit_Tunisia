package tn.esprit.spring.visit_tunisia.controllers;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;

@RestController
@RequestMapping("/api/weather")
@CrossOrigin(origins = "*")
public class WeatherController {

    @Value("${weather.api.key}")
    private String apiKey;

    private static final String WEATHER_API_URL = "https://api.openweathermap.org/data/2.5/forecast";

    /**
     * Proxy endpoint for OpenWeatherMap API to avoid CORS issues
     * GET /api/weather/forecast?lat=36.81&lon=10.17
     */
    @GetMapping("/forecast")
    public ResponseEntity<?> getForecast(
            @RequestParam("lat") double latitude,
            @RequestParam("lon") double longitude
    ) {
        try {
            // Build API URL with parameters
            String url = String.format(
                "%s?lat=%f&lon=%f&units=metric&lang=fr&appid=%s",
                WEATHER_API_URL, latitude, longitude, apiKey
            );

            // Call OpenWeatherMap API
            RestTemplate restTemplate = new RestTemplate();
            String response = restTemplate.getForObject(url, String.class);

            return ResponseEntity.ok(response);

        } catch (HttpClientErrorException.Unauthorized e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("{\"error\": \"Invalid API key\", \"message\": \"" + e.getMessage() + "\"}");

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"Weather API call failed\", \"message\": \"" + e.getMessage() + "\"}");
        }
    }
}
