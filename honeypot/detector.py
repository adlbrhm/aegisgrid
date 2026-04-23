# detector.py — Threat classification engine

import re
import os
from collections import defaultdict
from datetime import datetime, timedelta

_ip_counts = defaultdict(list)
PRIVATE_PREFIXES = ('127.', '192.168.', '10.', '172.', '::1', 'localhost')
MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'ml', 'model.pkl')

_model = None
_vectorizer = None

def load_ml_model():
    global _model, _vectorizer
    try:
        import joblib
        if os.path.exists(MODEL_PATH):
            saved = joblib.load(MODEL_PATH)
            _model = saved['model']
            _vectorizer = saved['vectorizer']
            print("[ML] Classifier model loaded successfully")
        else:
            print("[ML] No model found — using rule-based detection only")
    except Exception as e:
        print(f"[ML] Could not load model: {e}")

load_ml_model()

# Rule-based detection

def _detect_by_rules(ip, port, payload):
    payload_lower = (payload or '').lower()
    
    brute_keywords = ['user', 'pass', 'login', 'admin', 'root', 'password', 
                      'username', 'auth', '220', 'ssh', 'ftp']
    if any(kw in payload_lower for kw in brute_keywords):
        threat = _get_threat_level(ip)
        return 'brute_force', threat
    
    if len(payload or '') < 10:
        return 'port_scan', 'low'
    
    if port == 502:
        return 'ics_probe', 'critical'
    
    web_exploits = ['../..', 'etc/passwd', 'cmd=', 'exec(', '<script', 
                    'union select', 'drop table', 'wget ', 'curl ']
    if any(kw in payload_lower for kw in web_exploits):
        return 'web_exploit', 'high'
    
    recon_keywords = ['version', 'banner', 'service', 'get /', 'head ', 'options ']
    if any(kw in payload_lower for kw in recon_keywords):
        return 'recon', 'medium'
    
    return 'unknown', 'low'

def _get_threat_level(ip):
    now = datetime.now()
    _ip_counts[ip] = [t for t in _ip_counts[ip] if now - t < timedelta(seconds=60)]
    _ip_counts[ip].append(now)
    
    count = len(_ip_counts[ip])
    
    if count >= 20:
        return 'critical'
    elif count >= 10:
        return 'high'
    elif count >= 5:
        return 'medium'
    else:
        return 'low'

# ML detection

def _detect_by_ml(payload):
    try:
        features = _vectorizer.transform([payload or ''])
        prediction = _model.predict(features)[0]
        return prediction
    except Exception:
        return None

# Classification logic

def classify(ip, port, payload):
    attack_type, threat_level = _detect_by_rules(ip, port, payload)
    
    if _model is not None and payload:
        ml_type = _detect_by_ml(payload)
        if ml_type and ml_type != 'unknown':
            attack_type = ml_type
    
    return attack_type, threat_level