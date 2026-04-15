package com.cybersafe.backend;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

import org.springframework.web.bind.annotation.CrossOrigin;

@RestController
@CrossOrigin(origins = "*")   // 🔥 ADD THIS
public class RiskController {

    @GetMapping("/api/test")
    public String test() {
        return "Backend connected successfully!";
    }

    @PostMapping("/api/analyze")
    public Map<String, Object> analyze(@RequestBody Map<String, Object> request) {

    // Get features from request
    List<Integer> features = (List<Integer>) request.get("features");

    // Simple scoring logic (temporary)
    int sum = 0;
    for (int f : features) {
        sum += f;
    }

    int score = Math.min(100, 40 + sum * 5);

    Map<String, Object> response = new HashMap<>();
    response.put("score", score);
    response.put("threat", score > 75 ? "High Risk" : "Safe");

    return response;
    }
}