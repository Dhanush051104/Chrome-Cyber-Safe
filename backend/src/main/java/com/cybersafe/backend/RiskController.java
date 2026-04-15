package com.cybersafe.backend;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

@RestController
@CrossOrigin(origins = "*")   // 🔥 ADD THIS
public class RiskController {

    @GetMapping("/api/test")
    public String test() {
        return "Backend connected successfully!";
    }
}