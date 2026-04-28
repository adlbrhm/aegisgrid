# Simulate port scanning behavior
# USE ONLY ON YOUR OWN SYSTEM / AUTHORISED TARGETS
#
# Usage:
#   python demo/scanner.py              (defaults to 127.0.0.1)
#   python demo/scanner.py 1.2.3.4     (target EC2 public IP)

import socket
import time
import random
import sys

TARGET_HOST = sys.argv[1] if len(sys.argv) > 1 else '127.0.0.1'
PORTS = [8888, 8080, 2222]  # Configured honeypot ports only — avoid scanning production services

print("[DEMO] Port Scanner Simulation Starting...")
print(f"[DEMO] Target: {TARGET_HOST}")
print("[DEMO] Ports: 8888 (SCADA), 8080 (HTTP), 2222 (Fake SSH)")
print("[DEMO]\n")

for i in range(20):
    port = random.choice(PORTS)
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        s.connect((TARGET_HOST, port))
        banner = s.recv(256)
        print(f"[SCAN] Connected to port {port} | Banner: {banner[:50]}")
        s.close()
    except Exception as e:
        print(f"[SCAN] Port {port} — {e}")

    time.sleep(random.uniform(0.3, 0.8))

print("\n[DEMO] Scan simulation complete. Check dashboard for logs.")