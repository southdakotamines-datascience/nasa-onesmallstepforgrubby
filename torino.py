import requests
import math

# this prolly calcs 0 torino for nearly all celestial bodies which is accurate (lame)

url = "https://ssd-api.jpl.nasa.gov/sentry.api"
default_params = {
    "json": "true",
}


# query sentry for object 'des'
def fetch_sentry_object(designation, extra_params=None):
    params = default_params.copy()
    params["des"] = designation
    if extra_params:
        params.update(extra_params)
    r = requests.get(url, params={"des": designation}, timeout=30)
    r.raise_for_status()
    return r.json()

# h --> d (km)
def estimate_diameter_km(H, albedo=0.14):
    return 1329 / math.sqrt(albedo) * 10 ** (-0.2 * H)

def estimate_energy_megatons(H, v_inf=17.0, rho=3000.0):
    D_km = estimate_diameter_km(H)
    r_m = (D_km * 1000) / 2
    mass = (4/3) * math.pi * r_m**3 * rho
    E_joules = 0.5 * mass * (v_inf * 1000)**2
    return E_joules / 4.184e15   # J - megatons tnt

def approximate_torino(probability, energy_mt):
    if probability < 1e-6 or energy_mt < 1:
        return 0
    if probability < 1e-5 and energy_mt < 10:
        return 0
    if probability < 1e-4:
        return 1
    if probability < 1e-3:
        return 2 if energy_mt < 100 else 3
    if probability < 1e-2:
        return 4
    if probability < 0.1:
        return 5
    if probability < 1:
        return 6 if energy_mt < 1000 else 8
    return 10


# uses sentry
def analyze_object(des):
    data = fetch_sentry_object(des)
    h = float(data.get("h", 999))
    ip_max = float(data.get("ip_max", 0))
    v_inf = float(data.get("v_inf", 17))
    ts_official = data.get("ts_max", None)

    energy = estimate_energy_megatons(h, v_inf)
    torino_est = approximate_torino(ip_max, energy)

    # prints info feel free to change
    print(f"Object: {data.get('fullname', des)}")
    print(f" H = {h}")
    print(f" Impact probability = {ip_max}")
    print(f" Velocity = {v_inf} km/s")
    print(f" Estimated energy = {energy:,.1f} Mt TNT") 
    print(f" Approx. Torino = {torino_est:,.10f}")
    print(f" Official ts_max = {ts_official}")


# custom asteroids
def analyze_custom_object(h=999, ip_max=0, v_inf=17, des=None):
    energy = estimate_energy_megatons(h, v_inf)
    torino_est = approximate_torino(ip_max, energy)

    # feel free to change later
    print(f" H = {h}")
    print(f" Impact probability = {ip_max}")
    print(f" Velocity = {v_inf} km/s")
    print(f" Estimated energy = {energy:,.1f} Mt TNT") 
    print(f" Approx. Torino = {torino_est:,.10f}")


# example
if __name__ == "__main__":
    analyze_object("99942") 
    analyze_custom_object(18, 1e-3, 17)