# CogniHood Driver Safety System

> A human-centered predictive mobility platform leveraging high-frequency biometric telemetry and AI-driven environment analysis for real-time driver safety monitoring.

![Build Status](https://img.shields.io/badge/build-passing-success?style=flat-square)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square&logo=typescript)

---

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [System Requirements](#system-requirements)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [Usage](#usage)
8. [Project Structure](#project-structure)
9. [Contributing](#contributing)
10. [License](#license)
11. [Authors & Acknowledgements](#authors--acknowledgements)
12. [Contact](#contact)

---

## Overview

The **CogniHood Driver Safety System** is an advanced, AI-integrated cabin vision and cognitive load monitoring application. Designed to mitigate driver fatigue and preemptively identify environmental hazards, the system synthesizes high-frequency biometric data with real-time driving context. By establishing a continuous "Safety Index" and employing graduated autonomy protocols, CogniHood provides a robust framework for next-generation vehicle safety integration.

---

## Features

* **High-Frequency Biometric Telemetry:** Utilizes GPU-accelerated facial landmarking to achieve a 5ms (200 FPS) sample rate, tracking Eye Aspect Ratio (EAR), blink rates, and precise head pose metrics (pitch, yaw, roll).
* **AI Cognitive Engine:** Integrates large language models to analyze visual streams, deriving real-time cognitive load, stress, and distraction levels.
* **Persistent Safety Logic (Hysteresis):** Employs strict thresholds to prevent notification jitter. The system enters an "At Risk" state if the Safety Index drops below 85.0 and requires a stabilized recovery threshold of 92.0 to clear the alert.
* **Graduated Autonomy Protocol:** Features decoupled intervention logic that triggers external hardware (Safety Lights) and persistent UI warnings during critical events.
* **Cognitive Fingerprinting & Archives:** Maintains historical trend analysis and reflective replays of past incidents for long-term driver performance evaluation.
* **Simulated V2X Communication (CDAN):** Real-time awareness of networked events, including fatigue beacons from surrounding vehicles, emergency corridor routing, and ghost object detection.
* **Secure Biometric Access:** Enforces terminal authentication with simulated SHA-256 privacy masking and unique driver profiling (CogniID).

---

## Technology Stack

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **React** | 18.x | Core front-end framework and functional component architecture. |
| **TypeScript** | 5.x | Static typing for reliable data modeling and interface definitions. |
| **Node.js** | 18.x+ | Runtime environment for local development and dependency management. |
| **MediaPipe** | Latest | GPU-accelerated `FaceLandmarker` for high-fidelity biometric telemetry. |
| **Google Gemini API** | 1.5 Pro/Flash | Vision-based semantic reasoning and environment context analysis. |
| **Tailwind CSS** | 3.x | Utility-first CSS framework for rapid, responsive UI development. |

---

## System Requirements

Prior to execution, ensure the host environment meets the following prerequisites:

* **Node.js:** Version 18.0.0 or higher.
* **Hardware:** An active webcam or equivalent video input device for biometric telemetry.
* **API Access:** A valid Google Gemini API Key with vision capabilities enabled.
* **Browser:** A modern, WebGL-compatible browser (Google Chrome or Mozilla Firefox recommended) for hardware acceleration.

---

## Installation

Follow these steps to configure the development environment locally:

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Prarth314/Cognihood.git](https://github.com/Prarth314/Cognihood.git)
   cd Cognihood
