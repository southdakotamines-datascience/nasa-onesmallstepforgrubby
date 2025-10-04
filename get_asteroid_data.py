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

def get_asteroid_r_phi_theta():
  final_results = []
  for i, record in enumerate(approaches):
      object_name = record[name_index]
      close_approach_date = record[date_index]
    
      vector_coords = get_position_vector(object_name, close_approach_date)
      
      if vector_coords:
          x, y, z = vector_coords['X'], vector_coords['Y'], vector_coords['Z']
          
          r_au, theta_rad, phi_rad = spherical(x, y, z)
          
          final_results.append({
              "name": object_name,
              "date": close_approach_date,
              "r_au": r_au,
              "phi_deg": np.degrees(phi_rad),      
              "theta_deg": np.degrees(theta_rad)   
          })
  return final_results