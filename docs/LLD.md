<div align="center">

# Yenepoya Institute of Arts, Science, Commerce, and Management

## Low Level Design (LLD)
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
   1.1 <a href="#11-purpose">Purpose</a> ......................................... 01
   1.2 <a href="#12-scope">Scope</a> ........................................... 01
   1.3 <a href="#13-definitions">Definitions</a> ..................................... 02

2. <a href="#2-detailed-module-design">Detailed Module Design</a> .............................. 03
   2.1 <a href="#21-honeypot-engine">Honeypot Engine</a> ................................. 03
   2.2 <a href="#22-detection-module">Detection Module</a> ................................ 04
   2.3 <a href="#23-logger-module">Logger Module</a> ................................... 04
   2.4 <a href="#24-geoip-module">GeoIP Module</a> .................................... 05
   2.5 <a href="#25-dashboard-backend">Dashboard Backend</a> ............................... 05
   2.6 <a href="#26-frontend-ui">Frontend UI</a> ..................................... 06
   2.7 <a href="#27-main-runner">Main Runner</a> ..................................... 06

3. <a href="#3-functional-design">Functional Design</a> ................................... 07
   3.1 <a href="#31-main-functions">Main Functions</a> .................................. 07
   3.2 <a href="#32-input--output-flow">Input / Output Flow</a> ............................. 08
   3.3 <a href="#33-error-handling-logic">Error Handling Logic</a> ............................ 08
   3.4 <a href="#34-threading-model">Threading Model</a> ................................. 09

4. <a href="#4-database-design">Database Design</a> ..................................... 10
   4.1 <a href="#41-database-overview">Database Overview</a> ............................... 10
   4.2 <a href="#42-tables-and-fields">Tables and Fields</a> ............................... 11
   4.3 <a href="#43-relationships">Relationships</a> ................................... 12
   4.4 <a href="#44-sample-records">Sample Records</a> .................................. 12

5. <a href="#5-api--route-design">API / Route Design</a> .................................. 13
   5.1 <a href="#51-route-list">Route List</a> ...................................... 13
   5.2 <a href="#52-request-format">Request Format</a> .................................. 14
   5.3 <a href="#53-response-format">Response Format</a> ................................. 14

6. <a href="#6-ui-design">UI Design</a> ........................................... 15
   6.1 <a href="#61-layout-structure">Layout Structure</a> ................................ 15
   6.2 <a href="#62-components">Components</a> ...................................... 16
   6.3 <a href="#63-charts-and-visuals">Charts and Visuals</a> .............................. 16
   6.4 <a href="#64-theme-design">Theme Design</a> .................................... 17

7. <a href="#7-security-implementation">Security Implementation</a> ............................. 18
   7.1 <a href="#71-input-validation">Input Validation</a> ................................ 18
   7.2 <a href="#72-safe-logging">Safe Logging</a> .................................... 19
   7.3 <a href="#73-access-control">Access Control</a> .................................. 19
   7.4 <a href="#74-exception-handling">Exception Handling</a> .............................. 20

8. <a href="#8-testing-strategy">Testing Strategy</a> .................................... 21
   8.1 <a href="#81-unit-testing">Unit Testing</a> .................................... 21
   8.2 <a href="#82-functional-testing">Functional Testing</a> .............................. 22
   8.3 <a href="#83-attack-simulation-testing">Attack Simulation Testing</a> ....................... 22
   8.4 <a href="#84-performance-testing">Performance Testing</a> ............................. 23

9. <a href="#9-deployment-steps">Deployment Steps</a> .................................... 24

10. <a href="#10-references">References</a> ......................................... 25
</pre>

---

## 1. Introduction

### 1.1 Purpose
The Low Level Design (LLD) specifies the exact operational mechanics of the **AegisGrid Threat Intelligence Platform** platform. It provides the definitive technical blueprint necessary for engineers to trace execution logic, validate database schemas, interact with API endpoints, and ensure proper thread management. 

### 1.2 Scope
Details all physical implementations of the abstract concepts defined in the HLD. Includes explicit definitions for routing, HTTP payload schemas, SQL generation safety limits, machine learning pipeline execution, and frontend DOM manipulation logic. Server topology limits and OS constraints are additionally mapped.

### 1.3 Definitions
- **GIL:** Global Interpreter Lock (impacts Python multi-threading vs multi-processing).
- **DOM:** Document Object Model.
- **REST:** Representational State Transfer (JSON over HTTP).
- **Daemon Thread:** A background thread restricted to terminate abruptly when the parent wrapper exits.

---

## 2. Detailed Module Design

### 2.1 Honeypot Engine
**File:** `honeypot/engine.py`

Responsible for the primary network binding phase. Executes socket generation wrapped in high-availability loops catching native `OSError` exceptions. Connections hit `conn.settimeout(5)` to prevent infinite holding periods from Slowloris-style botnet attacks.

| Emulation Target | Port | Simulated Banner Output |
| :---: | :---: | :--- |
| **SCADA Mgmt** | `8888` | `SIEMENS S7-300 SCADA v2.1 — ACCESS DENIED` |
| **Modbus/TCP** | `502` | `MODBUS/TCP GATEWAY — UNAUTHORIZED ACCESS` |
| **HTTP/HMI** | `8080` | `HTTP/1.1 403 Forbidden` |
| **FTP Server** | `21` | `220 FTP Server Ready.` |
| **SSH Server** | `22` | `SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5` |


### 2.2 Detection Module
**File:** `honeypot/detector.py`

The execution hub for threat classification. Operates sequentially:
1. **Fallback Regex Evaluator:** Tests incoming buffers against pre-compiled Regex trees isolating signatures for typical `../` directory traversals or `SELECT` SQL injections.
2. **Machine Learning Predictor:** If no signature matches, execution falls to the serialized `RandomForestClassifier`. Evaluates term-frequency via a `TfidfVectorizer` limited to ~1,000 top n-grams, returning an inferred threat matrix.

### 2.3 Logger Module
**File:** `honeypot/logger.py`

Centralized access singleton for SQLite. Bootstraps the `attacks` schema during runtime utilizing `CREATE TABLE IF NOT EXISTS`. Every database execution opens an isolated cursor to prevent collision across engine threads polling identical hardware. Contains logic for extraction routing (e.g. `get_stats()`).

### 2.4 GeoIP Module
**File:** `honeypot/geoip.py`

Wrapper logic for the external `ip-api.com` service. Hardcodes evaluation of the IP target initially. If the target resides in `10.x.x.x` or `192.168.x.x` blocks, routing entirely circumvents HTTP calls and injects local dummy coordinates, preventing the free-tier API restriction points dropping.

### 2.5 Dashboard Backend
**File:** `dashboard/app.py`

A Flask 3.0 wrapper binding natively to port `5000`. Translates internal python dictionaries extracted by `.logger.py` directly to mapped JSON instances by leveraging `jsonify()`. Does not maintain internal Python application state.

### 2.6 Frontend UI
**Files:** `dashboard/templates/index.html`, `dashboard/static/script.js`

Contains the layout mechanics for the analytics platform. Uses an internal Javascript loop executing parallel `fetch()` requests every 5000ms. Converts GeoIP variables directly to SVG absolute coordinates mapped across the Mercator projection grid.

### 2.7 Main Runner
**File:** `run.py`

The bootstrapping entrypoint for the daemon logic. It triggers `start_all()` as a persistent daemon thread prior to calling `app.run()`, successfully marrying the Flask server and multi-port listeners under a singular terminal PID execution.

---

## 3. Functional Design

### 3.1 Main Functions
- **`start_listener(port)`**: Binds OS network port, enters `while True:` loop calling `accept()`.
- **`handle_client(conn, ip, port)`**: Performs the isolated execution thread of reads, classifications, logging, and fake banner transmittals.
- **`classify(payload, port)`**: Triggers the Regex and ML evaluation.
- **`api_stats()`**: Aggregates count variables natively via SQL functions inside `.logger.py` bridging directly to HTTP.

### 3.2 Input / Output Flow
Raw Byte Stream `->` UTF-8 Decoder (Drop Malformed) `->` Classification Pipeline `->` Tuple Map Generator `->` SQL Cursor execution `->` REST Poller `->` DOM Update.

### 3.3 Error Handling Logic
- Socket drops explicitly captured via `try..except Exception:` wrapper ensuring listener loops continue indefinitely.
- Broken ML files handled by defaulting prediction returns to `(unknown, low threat)`.

### 3.4 Threading Model
Follows a highly decoupled 1:N threading architecture, ensuring the master loop listener handles the minimum operations required (merely mapping port variables) before spawning.

```text
── [Main System PID]
     ├── (Dashboard Flask Thread)
     └── (Honeypot Supervisor Thread)
           ├── (Listener Daemon Port 22)  ==> {Spawns thread on activity}
           ├── (Listener Daemon Port 502) ==> {Spawns thread on activity}
           └── ... remaining ports
```

---

## 4. Database Design

### 4.1 Database Overview
- **Engine:** SQLite3
- **Configuration:** `PRAGMA journal_mode=WAL;`
- **Location:** Immutable `./data/honeypot.db` file.

### 4.2 Tables and Fields
**Table:** `attacks`
| Column | Data Type | Constraint |
| :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `timestamp` | TEXT | ISO 8601 Strings |
| `ip` | TEXT | Not Null |
| `port` | INTEGER | Valid Range 1-65535 |
| `payload` | TEXT | Nullable Unrestricted String |
| `attack_type` | TEXT | e.g., 'brute_force', 'web_exploit' |
| `threat_level` | TEXT | 'low', 'medium', 'high', 'critical' |
| `latitude/longitude` | REAL | Max float limits. |

### 4.3 Relationships
Strictly flat design; utilizing a single mega-table to remove relational complex `JOIN` calls entirely. This enables execution queries to execute strictly on internal disk indexing optimizations.

### 4.4 Sample Records
```text
| 121 | 2026-03-01T21:00:11Z | 103.20.10.15 | 22   | ROOT PASS | brute_force | high |
| 122 | 2026-03-01T21:04:19Z | 88.29.112.56 | 8888 |           | port_scan   | low  |
```

---

## 5. API / Route Design

### 5.1 Route List
- `GET /` — Template render origin.
- `GET /api/stats` — High-level metric aggregation JSON.
- `GET /api/attacks` — Standard chronological feed endpoint.
- `GET /api/geopoints` — Minified endpoint filtering map-restricted data structures.
- `GET /api/export` — Flat-file CSV attachment construction.

### 5.2 Request Format
`/api/attacks` accepts standard HTTP URL queries modifying cursor behavior:
- `?limit=100` defaults to 100 max arrays.
- `?search=<term>` applies substring matching on origins.

### 5.3 Response Format
```json
{
  "total": 921,
  "unique_ips": 54,
  "attack_types": [["ics_probe", 411], ["brute_force", 121]],
  "top_countries": [["China", 301], ["Russia", 212]]
}
```

---

## 6. UI Design

### 6.1 Layout Structure
Dark-mode heavy modularity utilizing CSS Grid logic (`grid-template-columns: repeat(4, 1fr)`). Divides application into Top Banner, KPI Ticker, Metric Squares, Interactive Map spanning 2x vertical depth, and trailing tabular datalist.

### 6.2 Components
- `ticker`: Unrestricted absolute positioned absolute text string sliding indefinitely.
- `terminal`: Isolated `overflow-y` mapped div simulating bash console outputs.

### 6.3 Charts and Visuals
Implemented dynamically via `Chart.js`:
- Line Graph mapping hour-by-hour telemetry volume execution.
- Doughnut executing comparative volume of threat types.
- Horizontal Bar tracking Top 5 geographical origins.

### 6.4 Theme Design
Constructed to emulate defense technology SOC (Security Operations Center) interfaces.
- **Backgrounds:** `#040d12`
- **Cyan Actives:** `#00c8f0`
- **Font Typography:** `Orbitron` header replacements paired to `Share Tech Mono` for numerical outputs ensuring aesthetic alignment to typical command-line operations.

---

## 7. Security Implementation

### 7.1 Input Validation
Network reads limited natively to `conn.recv(1024)`. Protects memory allocation logic against overflow attempts from complex threat actors pushing multi-megabyte payloads to lock execution layers.

### 7.2 Safe Logging
Database inputs securely parametrized bypassing manual string compilation. 
`cursor.execute("INSERT ... VALUES (?, ?)", (ip, payload))`

### 7.3 Access Control
Currently relies implicitly on infrastructure bounds (e.g., exposing port `5000` solely to AWS Security Groups restricted IP arrays). Production iteration mandates `Flask-Login` token verification implementation.

### 7.4 Exception Handling
Errors encountered logging or fetching API bounds print to terminal STDOUT instead of logging to a secondary SQL persistence table, ensuring corrupt data files cannot continuously throw nested error loops triggering VM crashes.

---

## 8. Testing Strategy

### 8.1 Unit Testing
Validate `detector.py` against mocked string logic enforcing standard routing behaviors:
`assert classify("USER admin", 22) == ("brute_force", "high")`

### 8.2 Functional Testing
Utilizing HTTP pinging tools (e.g. `cURL` or `Postman`) simulating requests against endpoints, verifying payload headers report application/json, and status codes fall into `200 OK` validation ranges.

### 8.3 Attack Simulation Testing
`nc localhost 502` execution loops ensuring honeypot instances detect, respond, and log the sequence consistently without process deterioration. Scripts provided natively in `/demo/` folders.

### 8.4 Performance Testing
Concurrent testing logic ensuring `get_stats()` executes natively beneath 500ms bounds even with SQLite tables scaling past 50,000 distinct network connections.

---

## 9. Deployment Steps
1. Push software structure to provisioned Ubuntu EC2 compute instance.
2. Ensure network security limits allow public incoming TCP routing against ports `21, 22, 502, 8080, 8888`.
3. Virtual environment bootstrapping via `python3 -m venv venv`.
4. Run standard requirement pipelines and native ML bootstrapping scripts.
5. Apply Linux `tmux` instance routing, allowing python environment to attach without dropping when SSH operators disconnect.

---

## 10. References
1. Python Software Foundation. *Python 3 Socket and Threading Handbooks.*
2. Pedregosa, F. et al. *Scikit-learn documentation.* JMLR, 12.
3. Pallets. *Flask Application Deployment Guides.*
4. OWASP. *Cross-Site Scripting (XSS) Prevention.*
5. CISA. *ICS/SCADA Cyber Incident Metrics.*

---

<div align="center">
  <br>
  <i>Low Level Design — Engineered for PRJN26-212</i>
</div>