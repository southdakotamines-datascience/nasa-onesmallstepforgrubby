// Constants
const EARTH_RADIUS = 20;
const REAL_EARTH_RADIUS_KM = 6371; // km
const SCALE = REAL_EARTH_RADIUS_KM / EARTH_RADIUS;
function toThreeJSScale(realKm) {
  return realKm / SCALE;
}
const EARTH_SPEED = 0.001;
const CLOUD_SPEED = 0.0012;
const ZOOM_SPEED = 2;
const MIN_DISTANCE = EARTH_RADIUS + 2;

// Asteroid / Launch Parameters (for future use)
// distance   // initial distance from Earth's center (km or scaled units)
// angleTheta // horizontal position angle around Earth (longitude, radians)
// anglePhi   // vertical position angle from North pole (latitude, radians)
// speed      // initial speed magnitude (km/s or scaled units)
// launchX    // horizontal launch angle relative to local tangent (radians)
// launchY    // vertical launch angle relative to local tangent (radians)
// radius     // asteroid radius (meters or scaled units)
// density    // asteroid density (kg/m^3 or g/cm^3)

// Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 50000);
camera.position.set(0, 0, 200);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(100, 50, 100);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.3));

const loader = new THREE.TextureLoader();
const earthTexture = loader.load("../images/earth.jpg");
const bumpTexture = loader.load("../images/earthbump.jpg");
const cloudTexture = loader.load("../images/earthclouds.png");

// Helper Functions
function createSphere(radius, segments, material){
  return new THREE.Mesh(new THREE.SphereGeometry(radius, segments, segments), material);
}

// setup
const earth = createSphere(EARTH_RADIUS, 512, new THREE.MeshPhongMaterial({
  map: earthTexture,
  bumpMap: bumpTexture,
  bumpScale: 3,
  specular: new THREE.Color(0x444444),
  shininess: 10
}));
scene.add(earth);

const clouds = createSphere(EARTH_RADIUS * 1.0125, 512, new THREE.MeshPhongMaterial({
  map: cloudTexture,
  transparent: true,
  opacity: 0.6,
  depthWrite: false,
  side: THREE.DoubleSide
}));
scene.add(clouds);

function addStarfield() {
  const starCount = 10000;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const r = 10000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i*3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i*3 + 2] = r * Math.cos(phi);

    const brightness = Math.random() * 0.8 + 0.2;
    colors[i*3] = colors[i*3+1] = colors[i*3+2] = brightness;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const starMat = new THREE.PointsMaterial({
    vertexColors: true,
    size: 40,
    sizeAttenuation: true
  });

  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);
}
addStarfield();

// Controls
function handleKey(e) {
  switch(e.code) {
    case 'KeyQ': camera.position.z -= ZOOM_SPEED; break;
    case 'KeyE': camera.position.z += ZOOM_SPEED; break;
    case 'ArrowUp': earth.rotation.x += 0.01; break;
    case 'ArrowDown': earth.rotation.x -= 0.01; break;
    case 'ArrowLeft': earth.rotation.y -= 0.01; break;
    case 'ArrowRight': earth.rotation.y += 0.01; break;
  }
}
window.addEventListener('keydown', handleKey);

// Act
function act(){
  earth.rotation.y += EARTH_SPEED;
  clouds.rotation.y += CLOUD_SPEED;
  // Future logic: asteroids, collisions, etc.
}

// Animation
function animate(){
  requestAnimationFrame(animate);
  act();
  camera.lookAt(earth.position);
  renderer.render(scene, camera);
}
animate();

// Make Window
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
