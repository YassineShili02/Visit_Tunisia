package tn.esprit.spring.visit_tunisia.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    /**
     * Create RestClient.Builder bean with proper Jackson configuration.
     * This builder will be injected into services that need to make HTTP calls.
     */
    @Bean
    public RestClient.Builder restClientBuilder(ObjectMapper objectMapper) {
        // Create Jackson converter with the configured ObjectMapper
        MappingJackson2HttpMessageConverter jackson2Converter = new MappingJackson2HttpMessageConverter(objectMapper);
        
        return RestClient.builder()
                .messageConverters(converters -> {
                    // Add Jackson converter for JSON serialization/deserialization
                    converters.add(0, jackson2Converter);
                });
    }
}
