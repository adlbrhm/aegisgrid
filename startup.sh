#!/bin/bash
# startup.sh — One command to relaunch the entire honeypot after reboot

cd ~/honeypot-energy
source venv/bin/activate

# Kill any existing tmux session
tmux kill-session -t honeypot 2>/dev/null

# Start fresh
tmux new-session -d -s honeypot "source venv/bin/activate && python3 run.py"
echo "Honeypot launched. Dashboard at http://$(curl -s ifconfig.me):5000"