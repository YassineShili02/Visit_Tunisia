package tn.esprit.spring.visit_tunisia.controllers;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.esprit.spring.visit_tunisia.enums.Categorie;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategorieController {

    @GetMapping
    public List<String> getAllCategories() {
        return Arrays.stream(Categorie.values())
                .map(Enum::name)
                .toList();
    }
}
