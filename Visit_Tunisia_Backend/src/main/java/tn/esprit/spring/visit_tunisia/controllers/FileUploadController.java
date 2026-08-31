package tn.esprit.spring.visit_tunisia.controllers;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tn.esprit.spring.visit_tunisia.services.FileStorageService;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.frontend.url:http://localhost:4200}")
public class FileUploadController {

    private final FileStorageService fileStorageService;

    /**
     * POST /api/uploads/destinations/{id}/photos
     * Accepts multipart file uploads, stores them, and returns the public URLs.
     */
    @PostMapping("/destinations/{destinationId}/photos")
    public ResponseEntity<Map<String, Object>> uploadPhotos(
            @PathVariable Integer destinationId,
            @RequestParam("files") MultipartFile[] files) {

        log.info("[UPLOAD] Receiving {} file(s) for destination {}", files.length, destinationId);

        List<String> urls = fileStorageService.storePhotos(destinationId, files);

        return ResponseEntity.ok(Map.of(
                "urls", urls,
                "count", urls.size()
        ));
    }

    /**
     * POST /api/uploads/evenements/{id}/photos
     * Accepts multipart file uploads for an event, stores them, and returns the public URLs.
     */
    @PostMapping("/evenements/{evenementId}/photos")
    public ResponseEntity<Map<String, Object>> uploadEventPhotos(
            @PathVariable Integer evenementId,
            @RequestParam("files") MultipartFile[] files) {

        log.info("[UPLOAD] Receiving {} file(s) for event {}", files.length, evenementId);

        List<String> urls = fileStorageService.storeEventPhotos(evenementId, files);

        return ResponseEntity.ok(Map.of(
                "urls", urls,
                "count", urls.size()
        ));
    }

    /**
     * DELETE /api/uploads/photo?url=/api/uploads/destinations/42/uuid.jpg
     * Deletes a stored photo file.
     */
    @DeleteMapping("/photo")
    public ResponseEntity<Void> deletePhoto(@RequestParam String url) {
        log.info("[UPLOAD] Deleting photo: {}", url);
        fileStorageService.deletePhoto(url);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/uploads/destinations/{destinationId}/{filename}
     * Serves the stored photo file.
     */
    @GetMapping("/destinations/{destinationId}/{filename:.+}")
    public ResponseEntity<Resource> servePhoto(
            @PathVariable Integer destinationId,
            @PathVariable String filename) {

        try {
            Path filePath = fileStorageService.resolveFile("destinations/" + destinationId + "/" + filename);

            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(filePath.toUri());

            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .body(resource);
        } catch (Exception e) {
            log.error("[UPLOAD] Error serving photo: {}", filename, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * GET /api/uploads/evenements/{evenementId}/{filename}
     * Serves the stored event photo file.
     */
    @GetMapping("/evenements/{evenementId}/{filename:.+}")
    public ResponseEntity<Resource> serveEventPhoto(
            @PathVariable Integer evenementId,
            @PathVariable String filename) {

        try {
            Path filePath = fileStorageService.resolveFile("evenements/" + evenementId + "/" + filename);

            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(filePath.toUri());

            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .body(resource);
        } catch (Exception e) {
            log.error("[UPLOAD] Error serving event photo: {}", filename, e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
