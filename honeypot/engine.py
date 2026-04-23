# engine.py — Core honeypot socket listener

import socket
import threading
import time
from honeypot import logger, detector, geoip

# ─── FAKE SERVICE RESPONSES ─────────────────────────────────────────

FAKE_RESPONSES = {
    8888: b"ENERGY-CTRL v2.1 | Siemens S7-300 Gateway | Auth required\r\n",
    502:  b"\x00\x01\x00\x00\x00\x06\x01\x83\x02",  # Modbus error response
    8080: b"HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Basic realm=\"SCADA Panel\"\r\nServer: EnergyOS/3.2\r\n\r\nAccess Denied",
    21:   b"220 Energy FTP Server v1.4 Ready\r\n",
    2222: b"SSH-2.0-OpenSSH_7.4 EnergyGrid\r\n",
}

DEFAULT_RESPONSE = b"ERROR: Authentication required. Unauthorized access logged.\r\n"

# ─── PORTS TO LISTEN ON ─────────────────────────────────────────────
# Minimal deployment set: SCADA (8888), HTTP (8080), Honeypot SSH (2222)
PORTS = [8888, 8080, 2222]

# ─── HANDLE ONE CONNECTION ──────────────────────────────────────────

def handle_connection(conn, addr, port):
    ip = addr[0]
    
    try:
        response = FAKE_RESPONSES.get(port, DEFAULT_RESPONSE)
        conn.send(response)
        
        conn.settimeout(3.0)
        try:
            payload = conn.recv(1024).decode('utf-8', errors='ignore').strip()
        except socket.timeout:
            payload = ""
        except Exception:
            payload = ""
        
        # Classify the attack
        attack_type, threat_level = detector.classify(ip, port, payload)
        
        # Get geographic location of the attacker
        geo = geoip.lookup(ip)
        
        # Save everything to database
        logger.log_attack(
            ip=ip,
            port=port,
            payload=payload[:500],   # Limit payload size stored
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

# ─── LISTENER FOR ONE PORT ──────────────────────────────────────────

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
        print(f"[WARN] Port {port} requires admin privileges — skipping")
    except OSError as e:
        print(f"[WARN] Port {port} unavailable: {e}")

# ─── START ALL LISTENERS ────────────────────────────────────────────

def start_all():
    logger.init_db()
    
    print("\n" + "="*50)
    print("  ENERGY SECTOR HONEYPOT — ONLINE")
    print("="*50)
    
    threads = []
    for port in PORTS:
        t = threading.Thread(target=start_listener, args=(port,), daemon=True)
        t.start()
        threads.append(t)
        time.sleep(0.1)  # Small delay between port launches
    
    print(f"\n[*] {len(PORTS)} honeypot ports active")
    print("[*] Waiting for attackers...\n")
    
    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[*] Honeypot shutting down")