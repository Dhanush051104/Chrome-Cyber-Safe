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

        // Backend is the ONLY scoring authority
        int sum = 0;
        for (int f : features) {
            sum += f;
        }

        // Score formula: base 40 + weighted sum, capped at 100
        int score = Math.min(100, 40 + sum * 5);

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
