import numpy as np
from astroquery.jplhorizons import Horizons
from astropy.time import Time
from datetime import datetime
import requests
api_url = "https://ssd-api.jpl.nasa.gov/cad.api?neo=true&pha=true&body=Earth"

listOfAU = []
closeApproachNum = 0

try:
  response = requests.get(api_url)

  response.raise_for_status()

  data = response.json()

except requests.exceptions.RequestException as e:
  print("Can not fetch data: {}".format(e))



fields = data.get("fields", [])
approaches = data.get("data", [])

closeApproachNum = len(approaches)

def get_position_vector(object_id, close_approach_date):
    try:
        datetimeOBJ = datetime.strptime(close_approach_date, '%Y-%b-%d %H:%M')
        t = Time(datetimeOBJ, scale="utc")
        obj = Horizons(id=object_id, location='@399', epochs = t.tdb.jd, id_type='smallbody')
        vectors = obj.vectors()
        X = vectors['x'][0]
        Y = vectors['y'][0]
        Z = vectors['z'][0]
        
        return {'X': X, 'Y': Y, 'Z': Z}
        
    except Exception as e:
        print(f"Error querying Horizons for {object_id} at {close_approach_date}: {e}")
        return None

def spherical(x,y,z):
  r = np.sqrt(x**2 + y**2 + z**2)
  if r == 0:
    return 0.0, 0.0, 0.0

  return r, np.arccos(z / r), np.arctan2(y, x)

try:
    name_index = fields.index('des')
    date_index = fields.index('cd')
except ValueError:
    print("Error: Required fields ('des' or 'cd') not found in API response.")
    exit()


def get_density_radius(asteroid_name):
   api_url2 = f"https://ssd-api.jpl.nasa.gov/sbdb.api?sstr={asteroid_name}&phys-par=1"
   try:
      response = requests.get(api_url2)
      response.raise_for_status()
      data = response.json()
      phys_params = data.get("phys_par", {})

      radius_km = None
      if "diameter" in phys_params:
        radius_km = float(phys_params["diameter"]) / 2
      
      density = None
      if "density" in phys_params:
        density = float(phys_params["density"])

        return {"radius_km": radius_km, "density": density}
   except requests.exceptions.RequestException as e:
        print(f"  -> Could not fetch SBDB data for {asteroid_name}: {e}")
        return {"radius_km": None, "density": None}

def get_asteroid_data():
  final_results = []
  for i, record in enumerate(approaches):
      asteroid_name = record[name_index]
      close_approach_date = record[date_index]
    
      vector_coords = get_position_vector(asteroid_name, close_approach_date)
      
      density_radius = get_density_radius(asteroid_name)

      if vector_coords:
          x, y, z = vector_coords['X'], vector_coords['Y'], vector_coords['Z']
          
          r_au, theta_rad, phi_rad = spherical(x, y, z)
          
          final_results.append({
              "name": asteroid_name,
              "date": close_approach_date,
              "r_au": r_au,
              "phi_deg": np.degrees(phi_rad),      
              "theta_deg": np.degrees(theta_rad),
              "radius_km": density_radius["radius_km"],
              "density": density_radius["density"]
          })
  return final_results