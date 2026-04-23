<div align="center">

# 🛡️ AegisGrid — Threat Intelligence Platform
**Enterprise-Grade Deception & Threat Intelligence Platform for ICS/SCADA Environments**

[![Status](https://img.shields.io/badge/Status-UNDER%20DEVELOPMENT-FF8C00?style=for-the-badge&logo=github)](.)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![License](https://img.shields.io/badge/License-MIT-2EA043?style=for-the-badge)](LICENSE)

</div>

---

> [!WARNING]  
> **🚧 UNDER ACTIVE DEVELOPMENT**  
> The core honeypot engine, ML classification pipeline, and SOC dashboard are fully operational. We are currently finalizing lab testing, deployment hardening, and academic documentation. This repository serves as a showcase of the project's current state.

---

## 🎯 Why AegisGrid?

Critical infrastructure—specifically the energy sector—is a prime target for advanced persistent threats (APTs). Operating Technology (OT) and Industrial Control Systems (ICS) cannot undergo routine patching without severe downtime risks. 

**AegisGrid** introduces a **low-interaction cyber deception platform** that emulates vulnerable energy infrastructure. By safely capturing, classifying, and mapping malicious traffic in real-time, defenders gain proactive threat intelligence without exposing true production assets.

---

## ✨ Key Features

| Capability | Description |
| :--- | :--- |
| 🔌 **Multi-Protocol Emulation** | Concurrent honeypots for Modbus/TCP (502), SCADA (8888), HTTP (8080), FTP (21), and SSH (22). |
| 🧠 **Two-Stage Classifier** | Deterministic attack identification via Regex, backed by a Random Forest ML model for anomaly detection. |
| 🌍 **Live IP Geolocation** | Automated resolution of attacker origin (Country, City, ISP, Coordinates) via `ip-api.com`. |
| 📊 **Real-Time SOC Dashboard** | High-performance, dark-theme web interface featuring Chart.js analytics and an animated SVG world map. |
| 💾 **High-Concurrency DB** | SQLite running in WAL (Write-Ahead Logging) mode guarantees no blocking under massive attack loads. |
| 🔒 **Enterprise Security** | Built-in Rate Limiting, HTTP Basic Auth, Strict CSP Headers, and Zero-DOM-Thrashing architecture. |

---

## 🏗️ Architecture Overview

The system is decoupled into two primary domains executing concurrently:

1. **The Deception Engine (Background):** Listens on target ports, intercepts traffic, classifies payloads, resolves geolocation, and logs to the database.
2. **The Intelligence Dashboard (Foreground):** A secure Flask-powered REST API and SPA frontend that visualizes the database records in real-time.

```text
  [Threat Actors] ──TCP──► [Multi-Port Listener] ──► [Attack Classifier]
                                    │                     (Regex + ML)
                                    ▼                          │
  [ip-api.com] ◄──HTTP─── [GeoIP Resolution] ◄─────────────────┘
                                    │
                                    ▼
  [SOC UI / Browser] ◄─── [Flask REST API] ◄─── [SQLite Db (WAL)]
```

---

## 🚀 Quick Start & Installation

**Prerequisites:** Python 3.10+ and Git.

```bash
# 1. Clone the repository
git clone https://github.com/adlbrhm/aegisgrid.git
cd aegisgrid

# 2. Initialize Virtual Environment
python -m venv venv
source venv/bin/activate    # Linux/Mac
venv\Scripts\activate       # Windows

# 3. Install Dependencies
pip install -r requirements.txt

# 4. Train the ML Model (Required on first run)
python ml/train_model.py

# 5. Launch SOC Platform (Dev Mode)
FLASK_ENV=development python run.py
```

Access the dashboard at: **http://localhost:5000** (Default Auth: `admin` / Password set via `AEGISGRID_PASSWORD` env variable, or bypasses if not set).

---

## 🛡️ Production Deployment (AWS EC2 Free Tier)

AegisGrid is engineered for minimal overhead, making it perfectly suited for an **AWS EC2 Free Tier** Ubuntu 22.04 instance.

**Important:** We use **Gunicorn directly** (No Nginx required) to expose the application, keeping the architecture simple and resource-friendly.

```bash
# 1. Install WSGI Server
pip install gunicorn

# 2. Export strict production credentials
export AEGISGRID_PASSWORD="SuperSecretPassword"
export FLASK_ENV=production

# 3. Launch AegisGrid
# -w 4 : Runs 4 concurrent workers handling heavy traffic
# -b 0.0.0.0:5000 : Binds directly to all public interfaces on port 5000
gunicorn -w 4 -b 0.0.0.0:5000 dashboard.app:app
```

*Note: Ensure your AWS Security Group allows incoming TCP traffic on ports 5000 (Dashboard) and your honeypot ports (8888, 8080, 2222).*

---

## 🔒 Security Highlights

The platform has undergone rigorous security hardening prior to release:
- **Zero XSS Risk:** `innerHTML` is entirely removed; the DOM is built using safe `textContent`.
- **API Protection:** `Flask-Limiter` actively rate-limits all endpoints.
- **Secure Headers:** Strict CSP, HSTS, and X-Frame-Options are enforced.
- **High Availability:** SQLite operates in `WAL` mode to prevent database locking during mass concurrent attacks.

---

## 📁 Repository Structure

```text
aegisgrid/
├── dashboard/          # Flask API and SOC Web Interface
├── docs/               # Architecture (HLD & LLD) Documentation
├── demo/               # Local attack simulation scripts
├── honeypot/           # Core Socket Listeners & Database Logic
├── ml/                 # Random Forest Classification Model
├── requirements.txt    # Python Dependencies
└── run.py              # Development execution script
```

---

## 🎭 Demo Tools

Validate the dashboard visually by simulating attacks locally:

```bash
# Run a simulated fast port-scan against all listening services
python demo/scanner.py

# Execute a simulated brute-force attack against the SSH module
python demo/bruteforce.py
```

---

## 📚 Academic Documentation

Full architectural and structural specifications are located in the `docs/` directory:

- [**High Level Design (HLD.md)**](./docs/HLD.md): System architecture, data flow, component design, and integration logic.
- [**Low Level Design (LLD.md)**](./docs/LLD.md): API routing, database schema, exact module functionalities, and security implementations.
- [**Final Report (FinalReport.md)**](./docs/FinalReport.md): Complete academic submission detailing methodology and project outcomes.

---

## ⚠️ Disclaimer

This tool is strictly designed for academic research and authorized laboratory environments. **Do not** deploy listening honeypots on public or enterprise networks without explicit administrative authorization and proper network isolation. 

---

## 🎓 Authors & Credits

- **Student Engineer:** Adhil P
- **Guided By:** Ms. Munisah
- **Industry Mentor:** Mr. Shashank
- **Institution:** Yenepoya Institute of Arts, Science, Commerce, and Management
- **Degree:** BCA in Cloud Computing, Cyber Security & Ethical Hacking

<div align="center">
  <br>
  <i>Originally Engineered as PRJN26-212</i>
</div>
