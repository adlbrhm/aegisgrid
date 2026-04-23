# run.py — System entrypoint
import threading
import time
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

def start_honeypot():
    from honeypot.engine import start_all
    start_all()

def start_dashboard():
    time.sleep(2)
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'dashboard'))
    from dashboard.app import app
    print("\n[*] Dashboard starting at http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)

if __name__ == '__main__':
    print("""
╔══════════════════════════════════════════════╗
║   AEGISGRID THREAT INTELLIGENCE — ONLINE     ║
║   Enterprise Deception Platform              ║
╚══════════════════════════════════════════════╝
    """)
    hp_thread = threading.Thread(target=start_honeypot, daemon=True)
    hp_thread.start()
    start_dashboard()