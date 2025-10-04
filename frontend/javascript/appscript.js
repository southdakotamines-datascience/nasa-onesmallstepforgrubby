// Constants
const EARTH_RADIUS = 20;
const REAL_EARTH_RADIUS_KM = 6371; // km
const SCALE = REAL_EARTH_RADIUS_KM / EARTH_RADIUS;
function toThreeJSScale(realKm) {
  return realKm / SCALE;
}
const EARTH_SPEED = 0.001;
const CLOUD_SPEED = 0.0012;

// Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 50000);
camera.position.set(0, 0, 200);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(100, 50, 100);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.3));

// Textures
const loader = new THREE.TextureLoader();
const earthTexture = loader.load("../images/earth.jpg");
const bumpTexture = loader.load("../images/earthbump.jpg");
const cloudTexture = loader.load("../images/earthclouds.png");

// Helper Function
function createSphere(radius, segments, material){
  return new THREE.Mesh(new THREE.SphereGeometry(radius, segments, segments), material);
}

// Earth
const earth = createSphere(EARTH_RADIUS, 512, new THREE.MeshPhongMaterial({
  map: earthTexture,
  bumpMap: bumpTexture,
  bumpScale: 3,
  specular: new THREE.Color(0x444444),
  shininess: 10
}));
scene.add(earth);

// Clouds
const clouds = createSphere(EARTH_RADIUS * 1.0125, 512, new THREE.MeshPhongMaterial({
  map: cloudTexture,
  transparent: true,
  opacity: 0.6,
  depthWrite: false,
  side: THREE.DoubleSide
}));
scene.add(clouds);

// Stars
function addStarfield() {
  const starCount = 20000;
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

// Act
function act(){
  earth.rotation.y += EARTH_SPEED;
  clouds.rotation.y += CLOUD_SPEED;
}

// Animation
function animate(){
  requestAnimationFrame(animate);
  act();
  camera.lookAt(earth.position);
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
