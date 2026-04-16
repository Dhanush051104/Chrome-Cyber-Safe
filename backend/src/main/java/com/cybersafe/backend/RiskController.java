package com.cybersafe.backend;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.util.*;

@RestController
@CrossOrigin(origins = "*")
public class RiskController {

    @GetMapping("/api/test")
    public String test() {
        return "Backend + DB config loaded";
    }

    @PostMapping("/api/blacklist")
public Map<String, Object> addToBlacklist(@RequestBody Map<String, String> request) {

    String domain = request.get("domain");

    Map<String, Object> response = new HashMap<>();

    if (domain == null || domain.isEmpty()) {
        response.put("status", "error");
        response.put("message", "Domain is empty");
        return response;
    }

    try {
        Connection conn = DriverManager.getConnection(
            "jdbc:mysql://localhost:3306/cybersafe", "root", "root123"
        );

        PreparedStatement stmt = conn.prepareStatement(
            "INSERT IGNORE INTO blacklist_domains (domain) VALUES (?)"
        );

        stmt.setString(1, domain);
        stmt.executeUpdate();

        conn.close();

        response.put("status", "success");
        response.put("message", "Domain added to blacklist");

        System.out.println("🚫 Added to global blacklist: " + domain);

    } catch (Exception e) {
        e.printStackTrace();
        response.put("status", "error");
        response.put("message", "DB error");
    }

    return response;
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

        // 🔥 Extract URL + domain
        String url = (String) request.get("url");
        String domain = "";

        if (url != null) {
            domain = url.replace("https://", "")
                        .replace("http://", "")
                        .split("/")[0];

            if (domain.startsWith("mail.")) {
                domain = domain.substring(5);
            }
        }


        // 🔥 Check trusted domains from DB
        try {
            java.sql.Connection conn = java.sql.DriverManager.getConnection(
            "jdbc:mysql://localhost:3306/cybersafe", "root", "root123"
            );

            java.sql.PreparedStatement stmt = conn.prepareStatement(
            "SELECT * FROM trusted_domains WHERE domain = ?"
            );

            stmt.setString(1, domain.replace("mail.", ""));
            java.sql.ResultSet rs = stmt.executeQuery();

            if (rs.next()) {
                Map<String, Object> response = new HashMap<>();
                response.put("score", 5);
                response.put("threat", "Safe");

                System.out.println("✅ Trusted domain from DB: " + domain);

                conn.close();
                return response;
            }

            conn.close();

        } catch (Exception e) {
            e.printStackTrace();
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
