import numpy as np
from astroquery.jplhorizons import Horizons
from astropy.time import Time
from datetime import datetime
import requests
api_url = "https://ssd-api.jpl.nasa.gov/cad.api?pha=true&date-min=now&date-max=2060-10-05&body=Earth"

listOfAU = []
closeApproachNum = 0

# Trying to fetch the API
try:
  response = requests.get(api_url)
  response.raise_for_status()
  data = response.json()

except requests.exceptions.RequestException as e:
  print(f"Can not fetch data: {e}")


fields = data.get("fields", [])
approaches = data.get("data", [])

closeApproachNum = len(approaches)

# Getting the position vectors of the asteroid by fetching data from horizons using the asteroid name and its close approach date
def get_position_vector(asteroid_name, close_approach_date):
    try:
        datetimeOBJ = datetime.strptime(close_approach_date, '%Y-%b-%d %H:%M')
        t = Time(datetimeOBJ, scale="utc")
        obj = Horizons(id=asteroid_name, location='@399', epochs = t.tdb.jd, id_type='smallbody')
        vectors = obj.vectors()
        X = vectors['x'][0]
        Y = vectors['y'][0]
        Z = vectors['z'][0]
        VX = vectors['vx'][0]
        VY = vectors['vy'][0]
        VZ = vectors['vz'][0]
        
        return {'X': X, 'Y': Y, 'Z': Z, 'VX': VX, 'VY': VY, 'VZ': VZ}
        
    except Exception as e:
        print(f"Error querying Horizons for {asteroid_name} at {close_approach_date}: {e}")
        return None

# This here is just really simple converting to r, phi, and theta
def spherical(x,y,z):
  r = np.sqrt(x**2 + y**2 + z**2)
  if r == 0:
    return 0.0, 0.0, 0.0

  return r, np.arccos(z / r), np.arctan2(y, x)

# Indexing
try:
    name_index = fields.index('des')
    date_index = fields.index('cd')
except ValueError:
    print("Error: Required fields ('des' or 'cd') not found in API response.")
    exit()

# Fetching data from nasa api on asteroid physical parameters based on its name passed as a param to the func
def get_density_radius(asteroid_name):
   api_url2 = f"https://ssd-api.jpl.nasa.gov/sbdb.api?sstr={asteroid_name}&phys-par=1"
   try:
      response = requests.get(api_url2)
      response.raise_for_status()
      data = response.json()
      phys_params = data.get("phys_par", {})

      # Some of the asteroids don't have data on this so we have to check :/
      radius_km = None
      if "diameter" in phys_params:
        radius_km = float(phys_params["diameter"]) / 2
      
      density = None
      if "density" in phys_params:
        density = float(phys_params["density"])
        
   except requests.exceptions.RequestException as e:
        print(f"Could not fetch SBDB data for {asteroid_name}: {e}")
        return {"radius_km": None, "density": None}
   
   return {"radius_km": radius_km, "density": density}
   
def launch_angle(position, velocity, theta, phi):
   position_magnitude = np.linalg.norm(position)
   velocity_magnitude = np.linalg.norm(velocity)
   if position_magnitude == 0 or velocity_magnitude == 0:
      return {"km/s": 0, "launchX": 0, "launchY": 0}
   
   # Flight Angle = launchY = γ = arcsin( (r * v) / magnitude(r * v) )
   pos_velo_dot = (np.dot(position, velocity))
   mag_pos_velo_dot = (position_magnitude * velocity_magnitude)
   launchY = np.arcsin(pos_velo_dot / mag_pos_velo_dot)

   # Azimuth = launchX = arctan(velocity_east / velocity_north)
   east_val = np.array([-np.sin(phi), np.cos(phi), 0])
   north_val = np.array([-np.cos(theta) * np.cos(phi), -np.cos(theta) * np.sin(phi), np.sin(theta)])
   velocity_east = np.dot(velocity, east_val)
   velocity_north = np.dot(velocity, north_val)

   launchX = np.arctan2(velocity_east, velocity_north)

   # Simply converting the velocity from au/day to km/s so the layman can understand better
   km_per_s = velocity_magnitude * ( 149597870.7 / 86400 )
   return {"km/s": km_per_s, "launchX": launchX, "launchY": launchY}

# Final function that is called by the frontend to fetch the asteroid data in a list of dictionaries

final_results = []
for record in approaches:
    asteroid_name = record[name_index]
    close_approach_date = record[date_index]
    
    vector_coords = get_position_vector(asteroid_name, close_approach_date)
      
    density_radius = get_density_radius(asteroid_name)

    if vector_coords:
        x, y, z = vector_coords['X'], vector_coords['Y'], vector_coords['Z']
        positions = np.array([x, y, z])
        velocities = np.array([vector_coords['VX'], vector_coords['VY'], vector_coords['VZ']])
          
        r_au, theta, phi = spherical(x, y, z)

        launch_angles = launch_angle(positions, velocities, theta, phi)

        final_results.append({
            "name": asteroid_name,
            "date": close_approach_date,
            "distance": r_au,
            "anglePhi": phi,      
            "angleTheta": theta,
            "radius": density_radius["radius_km"],
            "density": density_radius["density"],
            "speed": launch_angles["km/s"],
            "launchX": launch_angles["launchX"],
            "launchY": launch_angles["launchY"]})

def get_asteroid_names():
   listy = []
   for temp in final_results:
      listy.append(temp["name"])
   return listy

def get_asteroid_data(name_of_object):
    for temp in final_results:
       if temp["name"] == name_of_object:
          return temp
    return