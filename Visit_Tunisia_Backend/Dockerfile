# ============================================================
# Stage 1 : compilation Maven du jar Spring Boot
# ============================================================
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Cache des dependances : copie du pom seul d'abord
COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn package -DskipTests -B

# ============================================================
# Stage 2 : runtime leger
# python3 + requests : requis par les scrapers lances en subprocess
# wget : requis par le healthcheck du compose (absent de l'image de base)
# ============================================================
FROM eclipse-temurin:17-jre
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-pip wget \
 && rm -rf /var/lib/apt/lists/* \
 && (pip3 install --no-cache-dir requests \
     || pip3 install --no-cache-dir --break-system-packages requests)

WORKDIR /app
COPY --from=build /app/target/Visit_Tunisia-0.0.1-SNAPSHOT.jar app.jar
COPY scraper ./scraper
RUN mkdir -p uploads scraper/output

EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]
