# app.py — Dashboard backend service
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from flask import Flask, render_template, jsonify, request, send_file
import csv
import io
from honeypot.logger import get_all_attacks, get_stats
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from functools import wraps
from flask import Response
import hmac

_PASSWORD = os.environ.get('AEGISGRID_PASSWORD', '').strip()
if not _PASSWORD:
    sys.exit("[FATAL] AEGISGRID_PASSWORD not set. Refusing to start.")

app = Flask(__name__)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

@app.after_request
def apply_secure_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:;"
    return response

@app.errorhandler(Exception)
def handle_exception(e):
    return jsonify({"error": "Internal server error"}), 500

def check_auth(username, password):
    return (
        hmac.compare_digest(username, 'admin') and
        hmac.compare_digest(password, _PASSWORD)
    )

def authenticate():
    return Response(
        'Verification required.\n', 401,
        {'WWW-Authenticate': 'Basic realm="AegisGrid SOC Login"'}
    )

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated

@app.route('/favicon.ico')
def favicon():
    return Response('', status=204)

@app.route('/')
@requires_auth
def dashboard():
    return render_template('index.html')

@app.route('/api/stats')
@requires_auth
@limiter.limit("30 per minute")
def api_stats():
    return jsonify(get_stats())

@app.route('/api/attacks')
@requires_auth
@limiter.limit("30 per minute")
def api_attacks():
    try:
        limit = int(request.args.get('limit', 100))
        limit = max(1, min(limit, 1000))
    except ValueError:
        limit = 100
        
    filter_type = request.args.get('type', '')
    search = request.args.get('search', '').lower()
    
    rows = get_all_attacks(limit=1000)
    attacks = []
    
    for row in rows:
        attack = {
            'id': row[0], 'timestamp': row[1], 'ip': row[2],
            'port': row[3], 'payload': row[4], 'attack_type': row[5],
            'threat_level': row[6], 'country': row[7], 'city': row[8],
            'latitude': row[9], 'longitude': row[10], 'isp': row[11]
        }
        
        if filter_type and attack['attack_type'] != filter_type:
            continue
        if search and search not in (attack['ip'] + attack['country'] + attack['attack_type']).lower():
            continue
        
        attacks.append(attack)
    
    return jsonify(attacks[:limit])

@app.route('/api/geopoints')
@requires_auth
@limiter.limit("15 per minute")
def api_geopoints():
    rows = get_all_attacks(limit=200)
    points = []
    for row in rows:
        lat, lon = row[9], row[10]
        if lat != 0.0 or lon != 0.0:
            points.append({
                'lat': lat, 'lon': lon, 'ip': row[2],
                'country': row[7], 'attack_type': row[5]
            })
    return jsonify(points)

@app.route('/api/export')
@requires_auth
@limiter.limit("1 per minute")
def export_logs():
    rows = get_all_attacks(limit=10000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Timestamp', 'IP', 'Port', 'Payload', 
                     'Attack Type', 'Threat Level', 'Country', 'City', 
                     'Latitude', 'Longitude', 'ISP'])
    for row in rows:
        writer.writerow(row)
    output.seek(0)
    return app.response_class(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=honeypot_logs.csv'}
    )

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
