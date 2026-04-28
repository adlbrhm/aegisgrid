# logger.py — SQLite telemetry persistence
import os
import sqlite3
from datetime import datetime

# Base paths
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.abspath(os.path.join(BASE_DIR, '..', 'data', 'honeypot.db'))

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('PRAGMA journal_mode=WAL;')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attacks (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp   TEXT NOT NULL,
            ip          TEXT NOT NULL,
            port        INTEGER NOT NULL,
            payload     TEXT,
            attack_type TEXT DEFAULT 'unknown',
            threat_level TEXT DEFAULT 'low',
            country     TEXT DEFAULT 'Unknown',
            city        TEXT DEFAULT 'Unknown',
            latitude    REAL DEFAULT 0.0,
            longitude   REAL DEFAULT 0.0,
            isp         TEXT DEFAULT 'Unknown'
        )
    ''')
    
    conn.commit()
    conn.close()
    print("[DB] Database initialised at:", DB_PATH)

def log_attack(ip, port, payload, attack_type='unknown', threat_level='low',
               country='Unknown', city='Unknown', lat=0.0, lon=0.0, isp='Unknown'):
    """
    Saves one attack event to the database.
    Called every time someone connects to our honeypot.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    cursor.execute('''
        INSERT INTO attacks 
        (timestamp, ip, port, payload, attack_type, threat_level, country, city, latitude, longitude, isp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (timestamp, ip, port, payload, attack_type, threat_level, country, city, lat, lon, isp))
    
    conn.commit()
    conn.close()
    
    print(f"[LOG] {timestamp} | {ip}:{port} | {attack_type} | {threat_level} | {country}")

def get_all_attacks(limit=500):
    """Returns the last N attack records for the dashboard."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM attacks ORDER BY id DESC LIMIT ?', (limit,))
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_stats():
    """Returns summary statistics for the dashboard."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    stats = {}
    
    # Total attack count
    cursor.execute('SELECT COUNT(*) FROM attacks')
    stats['total'] = cursor.fetchone()[0]
    
    # Unique attacker IPs
    cursor.execute('SELECT COUNT(DISTINCT ip) FROM attacks')
    stats['unique_ips'] = cursor.fetchone()[0]
    
    # Top 5 attacker IPs
    cursor.execute('''
        SELECT ip, COUNT(*) as cnt FROM attacks 
        GROUP BY ip ORDER BY cnt DESC LIMIT 5
    ''')
    stats['top_ips'] = cursor.fetchall()
    
    # Top 5 targeted ports
    cursor.execute('''
        SELECT port, COUNT(*) as cnt FROM attacks 
        GROUP BY port ORDER BY cnt DESC LIMIT 5
    ''')
    stats['top_ports'] = cursor.fetchall()
    
    # Attack type breakdown
    cursor.execute('''
        SELECT attack_type, COUNT(*) as cnt FROM attacks 
        GROUP BY attack_type ORDER BY cnt DESC
    ''')
    stats['attack_types'] = cursor.fetchall()
    
    # Last 24 hours timeline (hourly buckets)
    cursor.execute('''
        SELECT strftime('%H:00', timestamp) as hour, COUNT(*) as cnt
        FROM attacks
        WHERE timestamp >= datetime('now', '-24 hours')
        GROUP BY hour ORDER BY hour
    ''')
    stats['timeline'] = cursor.fetchall()
    
    # Top countries
    cursor.execute('''
        SELECT country, COUNT(*) as cnt FROM attacks 
        GROUP BY country ORDER BY cnt DESC LIMIT 5
    ''')
    stats['top_countries'] = cursor.fetchall()
    
    conn.close()
    return stats