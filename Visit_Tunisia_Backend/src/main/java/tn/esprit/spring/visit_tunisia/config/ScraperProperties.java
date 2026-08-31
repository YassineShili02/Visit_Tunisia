package tn.esprit.spring.visit_tunisia.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.scraper")
@Getter
@Setter
public class ScraperProperties {

    /**
     * Path to the Python executable (e.g., "python3", "python", or full path)
     */
    private String pythonPath = "python";

    /**
     * Directory containing the Python scraper scripts
     */
    private String scriptsDir = "./scraper";

    /**
     * Directory where the scraper outputs JSON files
     */
    private String outputDir = "./scraper/output";

    /**
     * Timeout in seconds for the Python scraper process
     */
    private int timeoutSeconds = 120;
}
