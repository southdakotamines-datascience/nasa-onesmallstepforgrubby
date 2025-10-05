import * as THREE from 'three';
import loadDropdown from './data-access.js'

// some constants for the scene
const EARTH_RADIUS = 100;
const REAL_EARTH_RADIUS_KM = 6371;
const SCALE = REAL_EARTH_RADIUS_KM / EARTH_RADIUS;
function toThreeJSScale(realKm) { return realKm / SCALE; }

const EARTH_SPEED = 0.001; // how fast the earth spins
const CLOUD_SPEED = 0.0012; // clouds spin a bit faster
const G_SIM = 100; // gravity strength

// set up the scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 50000);
camera.position.set(0,0,600);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// lights
const sun = new THREE.DirectionalLight(0xffffff,1);
sun.position.set(100,50,100);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff,0.3));

// textures
const loader = new THREE.TextureLoader();
const earthTexture = loader.load("https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg");
const bumpTexture = loader.load("https://threejs.org/examples/textures/planets/earth_bump_2048.jpg");
const cloudTexture = loader.load("https://threejs.org/examples/textures/planets/earth_clouds_1024.png");

function createSphere(radius, segments, material){
  return new THREE.Mesh(new THREE.SphereGeometry(radius,segments,segments), material);
}

// earth and clouds
const earth = createSphere(EARTH_RADIUS,128,new THREE.MeshPhongMaterial({
  map:earthTexture, bumpMap:bumpTexture, bumpScale:3
}));
scene.add(earth);

const clouds = createSphere(EARTH_RADIUS*1.0125,64,new THREE.MeshPhongMaterial({
  map:cloudTexture, transparent:true, opacity:0.6, depthWrite:false, side:THREE.DoubleSide
}));
scene.add(clouds);

// stars in the background
function addStarfield(){
  const starCount = 10000;
  const positions = new Float32Array(starCount*3);
  const colors = new Float32Array(starCount*3);

  for(let i=0;i<starCount;i++){
    const r = 10000;
    const theta = Math.random()*Math.PI*2;
    const phi = Math.acos(2*Math.random()-1);
    positions[i*3] = r*Math.sin(phi)*Math.cos(theta);
    positions[i*3+1] = r*Math.sin(phi)*Math.sin(theta);
    positions[i*3+2] = r*Math.cos(phi);
    const brightness = Math.random()*0.8+0.2;
    colors[i*3]=colors[i*3+1]=colors[i*3+2]=brightness;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(positions,3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(colors,3));

  const starMat = new THREE.PointsMaterial({ vertexColors:true, size:40, sizeAttenuation:true });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);
}
addStarfield();

// asteroid stuff
let asteroid = null;
let launched = false;
let trajectoryLine = null;

function spawnAsteroid(distance, angleTheta, anglePhi, speed, launchX, launchY, radius, density){
  // get rid of the old asteroid and trajectory if they exist
  if(asteroid) scene.remove(asteroid);
  if(trajectoryLine){
    scene.remove(trajectoryLine);
    trajectoryLine.geometry.dispose();
    trajectoryLine.material.dispose();
    trajectoryLine=null;
  }

  const distScaled = toThreeJSScale(distance + REAL_EARTH_RADIUS_KM);
  const speedScaled = toThreeJSScale(speed);
  const radiusScaled = Math.max(toThreeJSScale(radius),0.5);

  const newAsteroid = new THREE.Mesh(
    new THREE.SphereGeometry(radiusScaled,24,24),
    new THREE.MeshPhongMaterial({color:0xff5533})
  );

  // place asteroid in space
  newAsteroid.position.set(
    distScaled * Math.sin(anglePhi)*Math.cos(angleTheta),
    distScaled * Math.cos(anglePhi),
    distScaled * Math.sin(anglePhi)*Math.sin(angleTheta)
  );

  const vx = -Math.sin(anglePhi+launchY)*Math.cos(angleTheta+launchX);
  const vy = -Math.cos(anglePhi+launchY);
  const vz = -Math.sin(anglePhi+launchY)*Math.sin(angleTheta+launchX);

  newAsteroid.userData = {
    velocity: new THREE.Vector3(vx,vy,vz).normalize().multiplyScalar(speedScaled),
    radius: radiusScaled,
    density
  };

  scene.add(newAsteroid);
  asteroid = newAsteroid;

  // draw the path before launch
  drawTrajectory(asteroid,2000,0.5);
}

// gravity and trajectory calculations
function applyGravity(obj, dt){
  if(!obj) return;
  const rVec = new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0), obj.position);
  const distance = rVec.length();
  if(distance<=EARTH_RADIUS) return;
  const accel = rVec.clone().normalize().multiplyScalar(G_SIM/(distance*distance));
  obj.userData.velocity.add(accel.multiplyScalar(dt));
  obj.position.add(obj.userData.velocity.clone().multiplyScalar(dt));
}

function drawTrajectory(obj, steps=1000, dt=1){
  if(!obj) return;
  if(trajectoryLine){
    // get rid of old line
    scene.remove(trajectoryLine);
    trajectoryLine.geometry.dispose();
    trajectoryLine.material.dispose();
    trajectoryLine=null;
  }

  const pos = obj.position.clone();
  const vel = obj.userData.velocity.clone();
  const points = [];
  for(let i=0;i<steps;i++){
    const rVec = new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0), pos);
    const distance = rVec.length();
    if(distance<=EARTH_RADIUS) break;
    const accel = rVec.clone().normalize().multiplyScalar(G_SIM/(distance*distance));
    const velStep = vel.clone().add(accel.clone().multiplyScalar(dt));
    pos.add(velStep.clone().multiplyScalar(dt));
    vel.copy(velStep);
    points.push(pos.clone());
  }

  if(points.length>1){
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({color:0xffaa00});
    trajectoryLine = new THREE.Line(geom, mat);
    scene.add(trajectoryLine);
  }
}

// camera stuff
let impactCameraOffset = new THREE.Vector3(0, 200, 200);
let impactCameraLocked = false;
let impactOrbitAngle = 0;

function lockCameraOnImpact(){
  if(!redZone) return;
  impactCameraLocked = true;
  impactOrbitAngle = 0;
}

function updateImpactCamera(){
  if(!impactCameraLocked || !redZone) return;
  const impactWorldPos = new THREE.Vector3();
  redZone.getWorldPosition(impactWorldPos);

  impactOrbitAngle += 0.002;
  const radius = 300;
  const x = impactWorldPos.x + Math.cos(impactOrbitAngle)*radius;
  const z = impactWorldPos.z + Math.sin(impactOrbitAngle)*radius;
  const y = impactWorldPos.y + 150;

  camera.position.set(x,y,z);
  camera.lookAt(impactWorldPos);
}

function updateChaseCamera(obj, distanceMultiplier = 6, lerpFactor = 0.15) {
  if (!obj) return;
  const earthToAsteroid = obj.position.clone().sub(new THREE.Vector3(0,0,0)).normalize();
  const camDistance = obj.userData.radius * distanceMultiplier;
  const targetPos = obj.position.clone().add(earthToAsteroid.clone().multiplyScalar(camDistance));
  camera.position.lerp(targetPos, lerpFactor);
  camera.lookAt(obj.position);
}

// crater calculation
function calculateCrater(asteroidRadius, velocity, asteroidDensity, targetDensity=2700){
  const asteroidRadiusM = asteroidRadius * SCALE * 1000;
  const asteroidDiameterM = asteroidRadiusM * 2;
  const velocityM = velocity * SCALE * 1000;

  const k = 1.161; const mu = 0.55; const nu = 0.4;

  const diameter = k *
    Math.pow(asteroidDensity / targetDensity, 1/3) *
    Math.pow(asteroidDiameterM, nu) *
    Math.pow(velocityM, mu);

  const depth = 0.2 * diameter;

  return {diameter, depth};
}

// impact zones on earth
let redZone=null, orangeZone=null, yellowZone=null;
let zoneScale=0;

function createImpactZonesOnEarth(craterDiameterM, localImpactPos){
  // remove old zones
  [redZone, orangeZone, yellowZone].forEach(zone=>{
    if(zone) earth.remove(zone);
  });

  const craterRadius = (craterDiameterM / 2) / 1000 / SCALE;

  const p = localImpactPos.clone().normalize();
  const lat = Math.asin(p.y);
  const lon = Math.atan2(p.z, p.x);

  const sphericalToCartesian = (lat, lon, radius) => {
    return new THREE.Vector3(
      radius * Math.cos(lat) * Math.cos(lon),
      radius * Math.sin(lat),
      radius * Math.cos(lat) * Math.sin(lon)
    );
  };

  const createSphereZone = (color, radius, opacity) => {
    const mat = new THREE.MeshPhongMaterial({color, transparent:true, opacity, side:THREE.DoubleSide});
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius,64,64), mat);
    earth.add(mesh);
    mesh.position.copy(sphericalToCartesian(lat, lon, EARTH_RADIUS));
    return mesh;
  };

  redZone = createSphereZone(0xff0000, craterRadius, 0.8);
  orangeZone = createSphereZone(0xffa500, craterRadius*2, 0.5);
  yellowZone = createSphereZone(0xffff00, craterRadius*4, 0.3);

  zoneScale = 1;

  // get rid of asteroid after impact
  scene.remove(asteroid);
  asteroid = null;
  launched = false;

  lockCameraOnImpact();
}

// the main loop
function act(){
  earth.rotation.y += EARTH_SPEED;
  clouds.rotation.y += CLOUD_SPEED;

  if(launched && asteroid){
    // remove trajectory line once we launch
    if (trajectoryLine) {
        scene.remove(trajectoryLine);
        trajectoryLine.geometry.dispose();
        trajectoryLine.material.dispose();
        trajectoryLine = null;
    }

    applyGravity(asteroid,1);

    if(asteroid.position.length() <= EARTH_RADIUS){
      const localImpactPos = earth.worldToLocal(asteroid.position.clone());
      const impactVelocity = asteroid.userData.velocity.length();
      const crater = calculateCrater(asteroid.userData.radius, impactVelocity, asteroid.userData.density);
      console.log(`Asteroid hit! Estimated crater diameter: ${crater.diameter.toFixed(1)} m, depth: ${crater.depth.toFixed(1)} m`);
      createImpactZonesOnEarth(crater.diameter, localImpactPos);
    }

    updateChaseCamera(asteroid,6,0.15);
  } else {
    // show trajectory while asteroid is sitting there
    drawTrajectory(asteroid,2000,0.5);
  }

  // scale the impact zones gradually
  if(redZone && zoneScale<2){
    const scaleSpeed = 0.01;
    [redZone, orangeZone, yellowZone].forEach(zone=>{
      zone.scale.set(zoneScale, zoneScale, zoneScale);
    });
    zoneScale += scaleSpeed;
  }

  updateImpactCamera();
}

function animate(){
  requestAnimationFrame(animate);
  act();
  renderer.render(scene,camera);
}
animate();

// control panel
function updateAsteroidFromSliders(){
  const distance = parseFloat(document.getElementById("distance").value);
  const angleTheta = parseFloat(document.getElementById("angleTheta").value);
  const anglePhi = parseFloat(document.getElementById("anglePhi").value);
  const speed = parseFloat(document.getElementById("speed").value);
  const launchX = parseFloat(document.getElementById("launchX").value);
  const launchY = parseFloat(document.getElementById("launchY").value);
  const radius = parseFloat(document.getElementById("radius").value);
  const density = parseFloat(document.getElementById("density").value);

  spawnAsteroid(distance,angleTheta,anglePhi,speed,launchX,launchY,radius,density);
}

["distance","angleTheta","anglePhi","speed","launchX","launchY","radius","density"].forEach(id=>{
  document.getElementById(id).addEventListener("input", updateAsteroidFromSliders);
});

updateAsteroidFromSliders();

window.addEventListener("keydown",(e)=>{
  if(e.code==="ArrowUp") launched=true; // press up to launch
});

window.addEventListener("resize",()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});

window.onload(() => {
  loadDropdown();
});
