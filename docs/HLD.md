<div align="center">

# Yenepoya Institute of Arts, Science, Commerce, and Management

## High Level Design (HLD)
### AegisGrid Threat Intelligence Platform
---

| Parameter | Detail |
| :--- | :--- |
| **Project ID** | PRJN26-212 |
| **Candidate** | Adhil P |
| **Industry Mentor** | Mr. Shashank |
| **Project Guide** | Ms. Munisah |
| **Programme** | BCA — Cloud Computing, Cyber Security & Ethical Hacking |
| **Document Stage** | Final Submission |

</div>

---

## 📑 Table of Contents

<pre>
1. <a href="#1-introduction">Introduction</a> ........................................ 01
   1.1 <a href="#11-scope-of-the-document">Scope of the Document</a> ........................... 01
   1.2 <a href="#12-intended-audience">Intended Audience</a> ............................... 02
   1.3 <a href="#13-system-overview">System Overview</a> ................................. 02

2. <a href="#2-system-design">System Design</a> ....................................... 03
   2.1 <a href="#21-application-design">Application Design</a> .............................. 03
   2.2 <a href="#22-process-flow">Process Flow</a> .................................... 04
   2.3 <a href="#23-information-flow">Information Flow</a> ................................ 05
   2.4 <a href="#24-components-design">Components Design</a> ............................... 05
   2.5 <a href="#25-key-design-considerations">Key Design Considerations</a> ....................... 06
   2.6 <a href="#26-api-catalogue">API Catalogue</a> ................................... 07

3. <a href="#3-data-design">Data Design</a> ......................................... 08
   3.1 <a href="#31-data-model">Data Model</a> ...................................... 08
   3.2 <a href="#32-data-access-mechanism">Data Access Mechanism</a> ........................... 09
   3.3 <a href="#33-data-retention-policies">Data Retention Policies</a> ......................... 09
   3.4 <a href="#34-data-migration">Data Migration</a> .................................. 10

4. <a href="#4-interfaces">Interfaces</a> .......................................... 11

5. <a href="#5-state-and-session-management">State and Session Management</a> ........................ 12

6. <a href="#6-caching">Caching</a> ............................................. 13

7. <a href="#7-non-functional-requirements">Non-Functional Requirements</a> ......................... 14
   7.1 <a href="#71-security-aspects">Security Aspects</a> ................................ 14
   7.2 <a href="#72-performance-aspects">Performance Aspects</a> ............................. 15

8. <a href="#8-references">References</a> .......................................... 16
</pre>

---

## 1. Introduction

### 1.1 Scope of the Document
This High Level Design (HLD) document outlines the macroscopic architecture for **PRJN26-212: AegisGrid Threat Intelligence Platform**. It defines the conceptual framework, topological structure, inter-component communication patterns, and non-functional guarantees of the system. Code-specific implementation details (schemas, endpoints, algorithms) are reserved for the Low Level Design (LLD).

### 1.2 Intended Audience
- **Academic Evaluators:** To verify architectural soundness and project scope alignment.
- **Industry Mentor & Guide:** To assess applied security engineering principles and scalability paradigms.
- **Security Researchers:** Seeking context before adapting or extending the honeypot mechanism.

### 1.3 System Overview
The platform operates as a multi-vector cyber deception environment. By emulating highly targeted industrial services (SCADA, Modbus, SSH, FTP, HTTP), it acts as a passive beacon for malicious actors. Raw network payloads are intercepted and fed into a dual-stage classification engine—combining deterministic rule matching with a probabilistic Machine Learning (Random Forest) model. The resultant threat telemetry is enriched via geospatial APIs and streamed into a high-performance SOC dashboard.

---

## 2. System Design

### 2.1 Application Design
The architecture is fundamentally decoupled, adopting a **Concurrent Producer-Consumer** methodology. 
- **The Producer (Honeypot Engine):** Headless daemons that bind to network interfaces, execute threat classification, and write telemetry.
- **The Consumer (SOC Dashboard):** A Flask-powered REST API rendering analytics over the persistent dataset.

This separation of concerns ensures that high volumetric attack spikes do not degrade dashboard performance, and dashboard crashes cannot halt intelligence gathering.

### 2.2 Process Flow

```text
  [Attacker Probe]
         │
         ▼ (TCP Handshake)
  [Engine Port Listener] ───►  Capture raw payload string (< 1024 bytes)
         │  
         ▼
  [Classifier Engine] ──────►  Stage 1: Regex pattern match? ──(Yes)─┐
         │                          (No)                             │
         │                     Stage 2: Random Forest TF-IDF         │
         ▼                                                           │
  [GeoIP Resolver] ◄─────────  Perform REST Call to ip-api.com       │
         │                                                           │
         ▼                                                           │
  [Log Write] ◄──────────────  Persist to SQLite Database ◄──────────┘
         │
         ▼
  [Active Deception] ────────► Send contextual protocol banner (e.g., 'SCADA v2.1')
```

### 2.3 Information Flow
Data traversal is highly linear. Unprocessed TCP payloads move inward from the network edge and are progressively mutated into structured telemetry. Modifying the database acts as the strict demarcation line between the Engine and Dashboard. The Dashboard strictly reads from the datastore and streams JSON via REST to the frontend Javascript engine.

### 2.4 Components Design
**A. Multi-Port Networking Layer**
Leverages native Python `socket` functionality, utilizing short-lived daemonic threads per incoming connection to prevent bottlenecking.

**B. Threat Detection Module**
An ensemble pipeline. Rule-engines catch obvious reconnaissance (e.g., `/etc/passwd`), while the Scikit-Learn Random Forest acts as a heuristic safety net for ambiguous bytes.

**C. Persistence Layer**
A standard SQLite database operating explicitly in **WAL (Write-Ahead Logging)** mode. This provides fundamental concurrent safety: writers do not block readers.

**D. Presentation Layer**
A Flask-rendered SPA (Single Page Application) utilizing `Chart.js` for asynchronous visualization and DOM updates without page refreshes.

### 2.5 Key Design Considerations
1. **Low Footprint over Complexity:** Using SQLite and raw sockets over Redis/Docker ensures the platform runs seamlessly on constrained free-tier cloud instances (e.g., EC2 `t2.micro`).
2. **Deterministic Logging:** Private IPs (RFC 1918) bypass the GeoIP API entirely to prevent local testing from hitting rate limits.
3. **Deception Authenticity:** Faked banners map directly to Shodan query responses (e.g., `SIEMENS S7-300` strings).

### 2.6 API Catalogue
*(Detailed payloads documented in LLD)*
- `GET /api/stats` - Telemetry aggregation.
- `GET /api/attacks` - Filterable attack history.
- `GET /api/geopoints` - Coordinate arrays for map plotting.
- `GET /api/export` - Raw CSV extraction.

---

## 3. Data Design

### 3.1 Data Model
A highly denormalized, flat architecture. A single `attacks` table acts as a time-series ledger. This eliminates the CPU overhead of SQL `JOIN` statements during high-frequency dashboard polling.

### 3.2 Data Access Mechanism
All schema operations are tightly encapsulated within `.logger.py`. No external modules are permitted to issue raw SQL commands. Parameterized statements (`?`) are enforced globally to prevent secondary injection attacks against the honeypot.

### 3.3 Data Retention Policies
Designed as a rolling analysis platform. In production, logs exceeding 90 days should be automatically pruned or archived to mitigate disk bloat on low-storage virtual machines.

### 3.4 Data Migration
The system utilizes automated provisioning (`CREATE TABLE IF NOT EXISTS`). Schema migrations are not implemented; destructive rebuilds are standard for ephemeral intelligence nodes.

---

## 4. Interfaces
- **External Network Interface:** Exposes raw TCP sockets open to `0.0.0.0/0`.
- **Third-Party API Interface:** Conducts synchronous HTTP GET requests to `ip-api.com`.
- **Human Interface:** Exposes the Flask Dashboard over HTTP, rendering interactive SVGs and DOM nodes.

---

## 5. State and Session Management
- **Honeypot Engine:** Completely stateless. Threat actors are intentionally not sessionized. Every TCP packet is treated as an isolated event to reduce memory leaks during port-scan floods.
- **Web Dashboard:** Stateless REST API. Dashboard state (e.g., filter selection, terminal overflow limits) is maintained entirely client-side via JavaScript memory.

---

## 6. Caching
Internal caching is deliberately omitted. Caching API responses from the honeypot DB would introduce lag into the "Real-Time Terminal", defeating the operational aesthetic. Web assets (CSS/JS) utilize standard browser-level caching.

---

## 7. Non-Functional Requirements

### 7.1 Security Aspects
- **Strict Hardcoding:** All SQL commands are parameterized.
- **Port Segmentation:** Exposing administrative ports (Dashboard: 5000) strictly via IP-whitelisting while Honeypot ports remain fully public.
- **Output Encoding:** Frontend rendering utilizes safe DOM APIs (`textContent` heavily preferred over `innerHTML`) to neutralize cross-site scripting (XSS) from malicious payloads.

### 7.2 Performance Aspects
- **Thread Concurrency:** Engine threads are spawned and destroyed rapidly. 
- **DB Concurrency:** WAL-mode SQLite easily absorbs >100 inserts per second without locking the UI dashboard reads.
- **Browser Memory:** The JavaScript rendering loop automatically prunes terminal nodes exceeding 80 units to prevent browser memory leaks during sustained visualization.

---

## 8. References
1. Python Software Foundation. *Python 3 Library Documentation — socket, threading.*
2. Pedregosa, F. et al. *Scikit-learn: Machine Learning in Python.* JMLR, 2011.
3. SQLite Consortium. *Write-Ahead Logging.* SQLite Documentation.
4. Spitzner, L. *Honeypots: Tracking Hackers.* Addison-Wesley Professional.

---

<div align="center">
  <br>
  <i>High Level Design — Engineered for PRJN26-212</i>
</div>