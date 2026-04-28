# bruteforce.py — Simulates brute force login attempts against the honeypot
# USE ONLY ON YOUR OWN SYSTEM / AUTHORISED TARGETS
#
# Usage:
#   python demo/bruteforce.py              (defaults to 127.0.0.1)
#   python demo/bruteforce.py 1.2.3.4     (target EC2 public IP)

import socket
import time
import sys

TARGET_HOST = sys.argv[1] if len(sys.argv) > 1 else '127.0.0.1'
PORT = 8888  # SCADA honeypot port

CREDENTIALS = [
    ("admin", "admin"), ("admin", "password"), ("root", "root"),
    ("operator", "scada"), ("user", "123456"), ("admin", "admin123"),
    ("administrator", "password1"), ("guest", "guest"),
]

print("[DEMO] Brute Force Simulation Starting...")
print(f"[DEMO] Target: {TARGET_HOST}:{PORT}\n")

for user, passwd in CREDENTIALS:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(3)
        s.connect((TARGET_HOST, PORT))
        s.recv(256)  # Read banner
        payload = f"USER {user}\r\nPASS {passwd}\r\n"
        s.send(payload.encode())
        print(f"[BRUTE] Tried {user}:{passwd}")
        s.close()
    except Exception as e:
        print(f"[ERROR] {e}")
    time.sleep(0.4)

print("\n[DEMO] Brute force simulation complete. Check dashboard for logs.")