package tn.esprit.spring.visit_tunisia.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.junit.jupiter.api.BeforeEach;
import tn.esprit.spring.visit_tunisia.DTO.admin.CountsResponseDTO;
import tn.esprit.spring.visit_tunisia.DTO.admin.StatusPatchDTO;
import tn.esprit.spring.visit_tunisia.DTO.destination.DestinationResponse;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;
import tn.esprit.spring.visit_tunisia.exceptions.GlobalExceptionHandler;
import tn.esprit.spring.visit_tunisia.services.IAdminDestinationService;

import java.util.Map;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AdminDestinationControllerTest {

    private MockMvc mockMvc;

    private ObjectMapper objectMapper = new ObjectMapper();

    private IAdminDestinationService adminDestinationService = org.mockito.Mockito.mock(IAdminDestinationService.class);
    private tn.esprit.spring.visit_tunisia.repositories.UtilisateurRepository utilisateurRepository = org.mockito.Mockito.mock(tn.esprit.spring.visit_tunisia.repositories.UtilisateurRepository.class);

    @BeforeEach
    void setUp() {
        AdminDestinationController controller = new AdminDestinationController(adminDestinationService, utilisateurRepository);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /api/admin/destinations/import — Répond 202 ACCEPTED immédiatement")
    void testImportDestinations() throws Exception {
        doNothing().when(adminDestinationService).importDestinationsAsync(org.mockito.ArgumentMatchers.eq("Nabeul"), org.mockito.ArgumentMatchers.any());

        mockMvc.perform(post("/api/admin/destinations/import")
                        .param("gouvernorat", "Nabeul"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.message").value("Import de Nabeul lancé. Les destinations apparaîtront dans l'onglet Brouillons sous peu."));
    }

    @Test
    @DisplayName("GET /api/admin/destinations/counts — Répond 200 OK avec les compteurs")
    void testGetCounts() throws Exception {
        CountsResponseDTO counts = CountsResponseDTO.builder()
                .total(10)
                .actif(6)
                .brouillon(3)
                .archive(1)
                .build();

        when(adminDestinationService.getCounts()).thenReturn(counts);

        mockMvc.perform(get("/api/admin/destinations/counts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(10))
                .andExpect(jsonPath("$.actif").value(6))
                .andExpect(jsonPath("$.brouillon").value(3))
                .andExpect(jsonPath("$.archive").value(1));
    }

    @Test
    @DisplayName("PATCH /api/admin/destinations/{id}/statut avec Body JSON — Répond 200 OK")
    void testUpdateStatutWithJsonBody() throws Exception {
        StatusPatchDTO patchDTO = StatusPatchDTO.builder()
                .statut(StatutPublication.ACTIF)
                .build();

        DestinationResponse response = DestinationResponse.builder()
                .destinationId(101)
                .nom(Map.of("fr", "Musée de Nabeul"))
                .statut(StatutPublication.ACTIF)
                .build();

        when(adminDestinationService.updateStatut(eq(101), eq(StatutPublication.ACTIF))).thenReturn(response);

        mockMvc.perform(patch("/api/admin/destinations/101/statut")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(patchDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.destinationId").value(101))
                .andExpect(jsonPath("$.statut").value("ACTIF"));
    }
}
