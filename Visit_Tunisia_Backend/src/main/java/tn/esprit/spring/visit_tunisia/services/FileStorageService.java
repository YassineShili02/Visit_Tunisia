package tn.esprit.spring.visit_tunisia.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Service for storing and serving destination photos on the local filesystem.
 * Photos are stored under {upload-dir}/destinations/{destinationId}/
 */
@Service
@Slf4j
public class FileStorageService {

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    @Value("${server.port:8082}")
    private int serverPort;

    private Path rootPath;

    @PostConstruct
    public void init() {
        rootPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(rootPath);
            log.info("[FileStorage] Upload directory initialized at: {}", rootPath);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory: " + rootPath, e);
        }
    }

    /**
     * Store multiple photos for a destination.
     * Returns the list of public URLs for each uploaded file.
     */
    public List<String> storePhotos(Integer destinationId, MultipartFile[] files) {
        List<String> urls = new ArrayList<>();

        Path destDir = rootPath.resolve("destinations").resolve(String.valueOf(destinationId));
        try {
            Files.createDirectories(destDir);
        } catch (IOException e) {
            throw new RuntimeException("Could not create directory for destination " + destinationId, e);
        }

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;

            String originalName = file.getOriginalFilename();
            String extension = "";
            if (originalName != null && originalName.contains(".")) {
                extension = originalName.substring(originalName.lastIndexOf("."));
            }

            // Generate unique filename to avoid collisions
            String storedName = UUID.randomUUID().toString() + extension;
            Path targetPath = destDir.resolve(storedName);

            try {
                Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
                log.info("[FileStorage] Stored photo: {} for destination {}", storedName, destinationId);

                // Build the public URL
                String publicUrl = "/api/uploads/destinations/" + destinationId + "/" + storedName;
                urls.add(publicUrl);
            } catch (IOException e) {
                log.error("[FileStorage] Failed to store file: {}", originalName, e);
                throw new RuntimeException("Failed to store file: " + originalName, e);
            }
        }

        return urls;
    }

    /**
     * Store multiple photos for an event.
     * Returns the list of public URLs for each uploaded file.
     */
    public List<String> storeEventPhotos(Integer evenementId, MultipartFile[] files) {
        List<String> urls = new ArrayList<>();

        Path eventDir = rootPath.resolve("evenements").resolve(String.valueOf(evenementId));
        try {
            Files.createDirectories(eventDir);
        } catch (IOException e) {
            throw new RuntimeException("Could not create directory for evenement " + evenementId, e);
        }

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;

            String originalName = file.getOriginalFilename();
            String extension = "";
            if (originalName != null && originalName.contains(".")) {
                extension = originalName.substring(originalName.lastIndexOf("."));
            }

            String storedName = UUID.randomUUID().toString() + extension;
            Path targetPath = eventDir.resolve(storedName);

            try {
                Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
                log.info("[FileStorage] Stored photo: {} for evenement {}", storedName, evenementId);

                String publicUrl = "/api/uploads/evenements/" + evenementId + "/" + storedName;
                urls.add(publicUrl);
            } catch (IOException e) {
                log.error("[FileStorage] Failed to store file: {}", originalName, e);
                throw new RuntimeException("Failed to store file: " + originalName, e);
            }
        }

        return urls;
    }

    /**
     * Delete a photo file by its URL path.
     */
    public boolean deletePhoto(String photoUrl) {
        try {
            // photoUrl is like /api/uploads/destinations/42/uuid.jpg
            String relativePath = photoUrl.replace("/api/uploads/", "");
            Path filePath = rootPath.resolve(relativePath);

            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("[FileStorage] Deleted photo: {}", filePath);
                return true;
            }
            return false;
        } catch (IOException e) {
            log.error("[FileStorage] Failed to delete photo: {}", photoUrl, e);
            return false;
        }
    }

    /**
     * Resolve a stored file path from the relative URL.
     */
    public Path resolveFile(String relativePath) {
        return rootPath.resolve(relativePath).normalize();
    }

    public Path getRootPath() {
        return rootPath;
    }
}
