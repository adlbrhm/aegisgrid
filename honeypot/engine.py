# engine.py — Core honeypot socket listener

import socket
import threading
import time
from honeypot import logger, detector, geoip

FAKE_RESPONSES = {
    8888: b"ENERGY-CTRL v2.1 | Siemens S7-300 Gateway | Auth required\r\n",
    8080: b"HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Basic realm=\"SCADA Panel\"\r\nServer: EnergyOS/3.2\r\n\r\nAccess Denied",
    2222: b"SSH-2.0-OpenSSH_7.4 EnergyGrid\r\n",
}

DEFAULT_RESPONSE = b"ERROR: Authentication required. Unauthorized access logged.\r\n"

# Active honeypot ports
PORTS = [8888, 8080, 2222]

def handle_connection(conn, addr, port):
    ip = addr[0]
    try:
        conn.send(FAKE_RESPONSES.get(port, DEFAULT_RESPONSE))

        conn.settimeout(3.0)
        try:
            payload = conn.recv(1024).decode('utf-8', errors='ignore').strip()
        except (socket.timeout, Exception):
            payload = ""

        attack_type, threat_level = detector.classify(ip, port, payload)
        geo = geoip.lookup(ip)

        logger.log_attack(
            ip=ip,
            port=port,
            payload=payload[:500],
            attack_type=attack_type,
            threat_level=threat_level,
            country=geo['country'],
            city=geo['city'],
            lat=geo['lat'],
            lon=geo['lon'],
            isp=geo['isp']
        )

        print(f"[ALERT] {ip} → Port {port} | {attack_type} | {threat_level} | {geo['country']}")

    except Exception as e:
        print(f"[ERROR] Connection handling failed for {ip}: {e}")
    finally:
        conn.close()

def start_listener(port):
    try:
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(('0.0.0.0', port))
        server.listen(10)
        print(f"[*] Honeypot listening on port {port}")

        while True:
            try:
                conn, addr = server.accept()
                t = threading.Thread(
                    target=handle_connection,
                    args=(conn, addr, port),
                    daemon=True
                )
                t.start()
            except Exception as e:
                print(f"[ERROR] Port {port} accept error: {e}")
                time.sleep(1)

    except PermissionError:
        print(f"[WARN] Port {port} requires elevated privileges — skipping")
    except OSError as e:
        print(f"[WARN] Port {port} unavailable: {e}")

def start_all():
    logger.init_db()

    print("\n" + "="*50)
    print("  ENERGY SECTOR HONEYPOT — ONLINE")
    print("="*50)

    for port in PORTS:
        t = threading.Thread(target=start_listener, args=(port,), daemon=True)
        t.start()
        time.sleep(0.1)

    print(f"\n[*] {len(PORTS)} honeypot ports active")
    print("[*] Waiting for attackers...\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[*] Honeypot shutting down")