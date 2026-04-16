package com.cybersafe.backend;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.util.*;

@RestController
@CrossOrigin(origins = "*")
public class RiskController {

    @GetMapping("/api/test")
    public String test() {
        return "Backend connected successfully!";
    }

    @PostMapping("/api/analyze")
    public Map<String, Object> analyze(@RequestBody Map<String, Object> request) {

        // Safe cast — fixes Java unchecked cast warning
        List<Integer> features = new ArrayList<>();
        Object rawFeatures = request.get("features");

        if (rawFeatures instanceof List<?>) {
            for (Object obj : (List<?>) rawFeatures) {
                if (obj instanceof Number) {
                    features.add(((Number) obj).intValue());
                }
            }
        }

       // 🔥 Weighted scoring system (Phase 1 improvement)

        // Define weights for each feature index
        // (Adjust based on your extractFeatureVector order)
        int[] weights = {20, 15, 25, 10, 30, 15, 10, 20, 25, 15};

        int score = 0;

        // Apply weights
        for (int i = 0; i < features.size() && i < weights.length; i++) {
            score += features.get(i) * weights[i];
        }

        //  🔥 Combination bonuses (context-based logic)
        if (features.size() >= 3) {
            // Example: login + suspicious keyword + no HTTPS
            if (features.get(0) == 1 && features.get(2) == 1) {
                score += 20;
            }

            // Example: banking + urgency
            if (features.get(1) == 1 && features.get(3) == 1) {
                score += 25;
            }
        }

        // Normalize score
        score = Math.min(100, Math.max(0, score));
        String threat;
        if (score >= 75) {
            threat = "High Risk";
        } else if (score >= 50) {
            threat = "Suspicious";
        } else {
            threat = "Safe";
        }

        Map<String, Object> response = new HashMap<>();
        response.put("score",  score);
        response.put("threat", threat);

        System.out.println("✅ Analyzed request — Score: " + score + " | Threat: " + threat);

        return response;
    }
}
