# geoip.py — Attacker geolocation resolution
import requests

_cache = {}
PRIVATE_PREFIXES = ('127.', '192.168.', '10.', '172.', '::1', 'localhost')

_FALLBACK = {'country': 'Unknown', 'city': 'Unknown', 'lat': 0.0, 'lon': 0.0, 'isp': 'Unknown'}

def lookup(ip):
    if any(ip.startswith(p) for p in PRIVATE_PREFIXES):
        return {'country': 'Local Network', 'city': 'Local', 'lat': 0.0, 'lon': 0.0, 'isp': 'Local'}

    if ip in _cache:
        return _cache[ip]

    try:
        url = f"http://ip-api.com/json/{ip}?fields=country,city,lat,lon,isp,status"
        data = requests.get(url, timeout=3).json()

        if data.get('status') == 'success':
            result = {
                'country': data.get('country', 'Unknown'),
                'city':    data.get('city',    'Unknown'),
                'lat':     data.get('lat',     0.0),
                'lon':     data.get('lon',     0.0),
                'isp':     data.get('isp',     'Unknown'),
            }
        else:
            result = dict(_FALLBACK)

        _cache[ip] = result
        return result

    except Exception as e:
        print(f"[GeoIP] Lookup failed for {ip}: {e}")
        return dict(_FALLBACK)