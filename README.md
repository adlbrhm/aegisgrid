<div align="center">

# 🛡️ AegisGrid — Threat Intelligence Platform
**Enterprise-Grade Deception & Threat Intelligence Platform for ICS/SCADA Environments**

[![Status](https://img.shields.io/badge/Status-UNDER%20DEVELOPMENT-FF8C00?style=for-the-badge&logo=github)](https://github.com/adlbrhm/aegisgrid)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.1.3-000000?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![License](https://img.shields.io/badge/License-MIT-2EA043?style=for-the-badge)](https://github.com/adlbrhm/aegisgrid/blob/main/LICENSE)

</div>

---

> [!WARNING]
> **🚧 UNDER ACTIVE DEVELOPMENT**
> The core honeypot engine, ML classification pipeline, and SOC dashboard are fully operational. We are currently finalising lab testing, deployment hardening, and academic documentation. This repository serves as a showcase of the project's current state.

---

## 🎯 Why AegisGrid?

Critical infrastructure—specifically the energy sector—is a prime target for advanced persistent threats (APTs). Operating Technology (OT) and Industrial Control Systems (ICS) cannot undergo routine patching without severe downtime risks.

**AegisGrid** introduces a **low-interaction cyber deception platform** that emulates vulnerable energy infrastructure. By safely capturing, classifying, and mapping malicious traffic in real-time, defenders gain proactive threat intelligence without exposing true production assets.

---

## ✨ Key Features

| Capability | Description |
| :--- | :--- |
| 🔌 **Multi-Protocol Emulation** | Concurrent honeypots on SCADA (8888), HTTP (8080), and Fake SSH (2222). |
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

**Prerequisites:** Python 3.12+ and Git.

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
```

---

## 💻 Windows Local Demo

> [!NOTE]
> Run everything from the project root directory. No Gunicorn needed for local development.

```cmd
:: 1. Set password
set AEGISGRID_PASSWORD=demo123

:: 2. Launch the full system (honeypot engine + dashboard)
python run.py
```

Dashboard: **http://127.0.0.1:5000** (login: `admin` / `demo123`)

```cmd
:: 3. In a second terminal — run demo attack scripts
python demo\scanner.py 127.0.0.1
python demo\bruteforce.py 127.0.0.1
```

---

## 🛡️ Production Deployment (AWS EC2 Free Tier)

AegisGrid is engineered for minimal overhead, making it perfectly suited for an **AWS EC2 Free Tier** Ubuntu 22.04+ instance.

> [!IMPORTANT]
> **Run mode clarification:**
> - `python3 run.py` starts the **full system** (honeypot engine + dashboard on port 5000). Use this for everything.
> - `gunicorn ... dashboard.app:app` starts the **dashboard only** (no honeypot engine). Do **not** run Gunicorn while `run.py` is already running — they will conflict on port 5000.

```bash
# 1. Install Dependencies (Python 3.12 compatible)
pip install -r requirements.txt

# 2. Train the ML Model (Required on first run)
python3 ml/train_model.py

# 3. Set production credentials (mandatory — app refuses to start without this)
export AEGISGRID_PASSWORD="your-secure-password"
export FLASK_ENV=production

# 4. Launch full system
python3 run.py
```

Dashboard: **http://EC2_PUBLIC_IP:5000** (login: `admin` / your password)

**AWS Security Group inbound rules:**

| Port | Source | Purpose |
| :--- | :--- | :--- |
| 22 | My IP only | SSH admin access |
| 5000 | My IP only | SOC Dashboard |
| 8888 | 0.0.0.0/0 | SCADA Honeypot |
| 8080 | 0.0.0.0/0 | HTTP Honeypot |
| 2222 | 0.0.0.0/0 | Fake SSH Honeypot |

> [!NOTE]
> Local users can always access the dashboard via `http://127.0.0.1:5000` even when the app is bound to `0.0.0.0`.

---

## 🎭 Demo Attack Scripts

> [!WARNING]
> **⚠️ Never scan real port 22.** AegisGrid uses port **2222** for the fake SSH honeypot. The demo scripts are pre-configured to target only the three safe honeypot ports: `8888`, `8080`, `2222`.

Validate the dashboard by simulating attacks locally or against your EC2 instance:

```bash
# Windows (local)
python demo\scanner.py 127.0.0.1
python demo\bruteforce.py 127.0.0.1

# Ubuntu EC2 (remote — substitute your EC2 public IP)
python3 demo/scanner.py <EC2_PUBLIC_IP>
python3 demo/bruteforce.py <EC2_PUBLIC_IP>
```

Both scripts accept a target IP as an optional CLI argument and default to `127.0.0.1`.

---

## 🔒 Security Highlights

The platform has undergone rigorous security hardening prior to release:
- **Zero XSS Risk:** `innerHTML` is entirely removed; the DOM is built using safe `textContent`.
- **API Protection:** `Flask-Limiter` actively rate-limits all endpoints.
- **Mandatory Auth:** Hard fail-safe ensures the dashboard never boots without a configured `AEGISGRID_PASSWORD`.
- **Timing-Safe Auth:** Credentials verified via `hmac.compare_digest` to prevent timing oracle attacks.
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
└── run.py              # System entrypoint (honeypot + dashboard)
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
