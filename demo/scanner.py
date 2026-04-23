# scanner.py — Safe demo traffic generator
# Simulates a port scanner connecting to your honeypot
# USE ONLY ON YOUR OWN SYSTEM

import socket
import time
import random

TARGET_HOST = '127.0.0.1'  # Change to your server IP on AWS
PORTS = [8888, 502, 8080, 21, 22]

print("[DEMO] Port Scanner Simulation Starting...")
print(f"[DEMO] Target: {TARGET_HOST}")
print("[DEMO] This simulates attacker port scanning behaviour\n")

for i in range(20):  # 20 scan rounds
    port = random.choice(PORTS)
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        s.connect((TARGET_HOST, port))
        # Receive banner
        banner = s.recv(256)
        print(f"[SCAN] Connected to port {port} | Banner: {banner[:50]}")
        s.close()
    except Exception as e:
        print(f"[SCAN] Port {port} — {e}")
    
    time.sleep(random.uniform(0.3, 0.8))

print("\n[DEMO] Scan simulation complete. Check dashboard for logs.")