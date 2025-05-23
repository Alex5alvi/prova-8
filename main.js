import * as THREE from 'three';
import { gsap } from "gsap";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// === SCENA BASE ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 3, 6);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
let magnetActive = true;
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1, 0);
controls.update();
const zonePointClouds = [];
let selectedZone = null;
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
scene.add(new THREE.DirectionalLight(0xffffff, 1));


// === COLORI ===
const mainColorPalette = [
  new THREE.Color(0x4682EB),
  new THREE.Color(0x4E13EB),
  new THREE.Color(0x131EEB),
  new THREE.Color(0x13A6EB),
  new THREE.Color(0xA73FEB)
];

const duplicateColorPalette = [
  new THREE.Color(0xAD46EB),
  new THREE.Color(0xEB137C),
  new THREE.Color(0xE113EB),
  new THREE.Color(0x5313EB),
  new THREE.Color(0xEB413B)
];

const DUPLICATE_RATIO = 0.4;

// === CONFIGURAZIONE MODELLI ===
const modelConfigs = [
  {
    url: 'mod/testa.glb',
    points: 10000,
    baseColor: new THREE.Color(0x13A6EB),
    duplicateColor: new THREE.Color(0xEB137C),
    scale: 10                           // scala personalizzata
  },
  {
    url: 'mod/CALOTTA.glb',
    points: 50000,
    baseColor: new THREE.Color(0x13A6EB),
    duplicateColor: new THREE.Color(0xEB137C),
    scale: 10                           // scala personalizzata
  },
  {
    url: 'mod/testa2.glb',
    points: 18000,
    baseColor: new THREE.Color(0xA73FEB),
    duplicateColor: new THREE.Color(0xEB413B),
    scale: 10                            // scala personalizzata
  }
];

// === CONFIGURAZIONE UNICA PER TUTTI I MODELLI TNT ===
const tntModels = [
  'mod/tnt_0.glb',
  'mod/tnt_2.glb',
  'mod/tnt_3.glb',
  'mod/tnt_4.glb',
  'mod/tnt_5.glb',
  'mod/tnt_6.glb',
  'mod/tnt_7.glb',
  'mod/tnt_8.glb',
  'mod/tnt_1.glb'
];

const tntConfig = {
  points: 10000,
  baseColor: new THREE.Color(0x4682EB),
  duplicateColor: new THREE.Color(0xAD46EB),
  scale:10                              // scala condivisa per tutti i TNT
};
//________—______————__——_—————————————————————————————__///

const pointClouds = [];

// === LOADER ===
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
loader.setDRACOLoader(dracoLoader);

// === INTERAZIONE MOUSE ===
const mouse = new THREE.Vector2();
let mouse3D = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.15;
const clickableZones = [];

const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // piano z = 0
const planeIntersectPoint = new THREE.Vector3();

/////////////////////////////////SCANSIONE MODELLO CURSORE///////////////////////////////////////////////////

window.addEventListener('mousemove', (e) => {
  magnetActive = true;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(plane, planeIntersectPoint);

  if (planeIntersectPoint) {
    mouse3D.copy(planeIntersectPoint);  // Aggiorniamo la posizione 3D del mouse
  }
});

let isFocused = false;
/////////////////////////////////GESTIONE COLORI CLICK ZONE CLICCABILI///////////////////////////////////////////////////
const bottone = document.querySelector('#bottone');
bottone.addEventListener('click', () => {
  let clicked = null; // ✅ ora è visibile in tutto il blocco

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(zonePointClouds, false);

  pointClouds.forEach(pc => {
    const nc = new THREE.Color(Math.random(), Math.random(), Math.random());
    if (pc.material.isPointsMaterial) {
      gsap.to(pc.material.color, { r: nc.r, g: nc.g, b: nc.b, duration: 1 });
    } else if (pc.material.uniforms?.color) {
      gsap.to(pc.material.uniforms.color.value, { r: nc.r, g: nc.g, b: nc.b, duration: 1 });
    }
  });

  if (intersects.length > 0) {
    clicked = intersects[0].object;

    // Gestione selezione
    if (selectedZone && selectedZone !== clicked) {
      if (selectedZone.material.isPointsMaterial) {
        selectedZone.material.color.copy(selectedZone.userData.baseColor);
      } else if (selectedZone.material.uniforms?.color) {
        selectedZone.material.uniforms.color.value.copy(selectedZone.userData.baseColor);
      }
      selectedZone.userData.hovered = false;
    }

    // Imposta colore selezione
    if (clicked.material.isPointsMaterial) {
      clicked.material.color.set(0xFF3366);
    } else if (clicked.material.uniforms?.color) {
      clicked.material.uniforms.color.value.set(0xFF3366);
    }

    clicked.userData.hovered = true;
    selectedZone = clicked;

    // Camera focus
    clicked.geometry.computeBoundingBox();
    const centroid = new THREE.Vector3();
    clicked.geometry.boundingBox.getCenter(centroid);
    const offset = new THREE.Vector3(0, 0.5, 1.5);
    const focusPos = centroid.clone().add(offset);

    gsap.to(camera.position, {
      x: focusPos.x,
      y: focusPos.y,
      z: focusPos.z,
      duration: 1.5,
      ease: "power2.inOut"
    });

    gsap.to(controls.target, {
      x: centroid.x,
      y: centroid.y,
      z: centroid.z,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => controls.update()
    });

    isFocused = true;
  } else if (isFocused) {
    // reset camera
    isFocused = false;
    magnetActive = false;

    if (selectedZone) {
      if (selectedZone.material.isPointsMaterial) {
        selectedZone.material.color.copy(selectedZone.userData.baseColor);
      } else if (selectedZone.material.uniforms?.color) {
        selectedZone.material.uniforms.color.value.copy(selectedZone.userData.baseColor);
      }
      selectedZone.userData.hovered = false;
      selectedZone = null;
    }

    gsap.to(camera.position, { x:3, y:3, z:6, duration:1.5, ease:"power2.inOut" });
    gsap.to(controls.target, {
      x:0, y:1, z:0, duration:1.5, ease:"power2.inOut",
      onUpdate: () => controls.update()
    });
  }
});


////////////////////////////////////////////////////////////////////////////////////

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/////////////////////////////////LOADMODEL///////////////////////////////////////////////////


function loadModelWithColors(url, baseColor, duplicateColor, totalPoints, scale = 2) {
  loader.load(url, (gltf) => {
    gltf.scene.scale.set(scale, scale, scale);

// Rendi invisibile tutta la scena del modello (incluso mesh/materiali)
gltf.scene.traverse(obj => {
  if (obj.isMesh) {
    obj.visible = false;
    obj.material.transparent = true;
    obj.material.opacity = 0;
  }
});

// Aggiungi comunque alla scena per usare posizione, bounding box, ecc.
scene.add(gltf.scene);

    scene.add(gltf.scene);

    // Trova la mesh
    const mesh = gltf.scene.getObjectByProperty('type', 'Mesh');
    if (!mesh) {
      console.warn(`Nessun oggetto Mesh trovato nel modello: ${url}`);
      return;
    }
    
    // invece di createClickableZonesOnMesh(mesh,...)
// blu tenue, 3000 punti, raggio piccolo, brusca oscillazione
createClickableZonePointCloud(mesh, {
  count:    500,
  radius:   0.1,
  size:     0.02,
  color:    new THREE.Color(0x00ccff),
  opacity:  0.75,
  emission: 1,
  oscAmp:   5,
  oscFreq:  7
});


  // Creiamo la nube di punti del modello
createPointCloud(mesh, baseColor, totalPoints);
  const dupCount = Math.floor(totalPoints * DUPLICATE_RATIO);
    createPointCloud(mesh, duplicateColor, dupCount, 1.5, 2);

    // Calcolo bounding box per posizionare la nube fluttuante
    const bbox = new THREE.Box3().setFromObject(mesh);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    bbox.getCenter(center);
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) * scale;

    // Crea floating cloud locale
    createFloatingCloud({
      count: 1000,
      areaSize: maxDim * 10,
      center,
      palette: duplicateColorPalette
    });
  });
}
const meshSamplerCache = new WeakMap();


function randomPointInSphere(radius) {
  const u = Math.random();
  const v = Math.random();
  const θ = 2 * Math.PI * u;
  const φ = Math.acos(2 * v - 1);
  const r = radius * Math.cbrt(Math.random());
  return new THREE.Vector3(
    r * Math.sin(φ) * Math.cos(θ),
    r * Math.sin(φ) * Math.sin(θ),
    r * Math.cos(φ)
  );
}

////////////////////////////////////////////////////////////////////////
/**
 * Crea una zona cliccabile rappresentata da una nuvola di punti “emitter”
 *
 * @param {THREE.Mesh} mesh             – Mesh di riferimento su cui campionare il centro
 * @param {object} options              – Oggetto di configurazione
 * @param {number} options.count        – Numero di punti nella nuvola (es. 500 → 5000)
 * @param {number} options.radius       – Raggio della nuvola intorno al centro (es. 0.05 → 0.5)
 * @param {number} options.size         – Dimensione di ogni punto (es. 0.01 → 0.1)
 * @param {THREE.Color} options.color   – Colore base (es. 0x00ffff per blu elettrico)
 * @param {number} options.opacity      – Opacità del materiale (0.0 → 1.0)
 * @param {number} options.emission     – Intensità di additive blending (es. 0.2 → 1.0)
 * @param {number} options.oscAmp       – Ampiezza massima oscillazione (0.01 → 0.1)
 * @param {number} options.oscFreq      – Velocità oscillazione (0.1 → 1.0)
 */
function createClickableZonePointCloud(mesh, {
  count = 300,
  radius = 0.015,
  size = 0.05,
  color = new THREE.Color(0x7DF9FF),
  opacity = 1.0,
  oscAmp = 2,
  oscFreq = 4
} = {}) {
  const sampler = new MeshSurfaceSampler(mesh).build();
  const center = new THREE.Vector3();
  sampler.sample(center);
  mesh.localToWorld(center);

  const positions = [];
  const basePositions = [];
  const amp = [];
  const freq = [];
  const phase = [];

  for (let i = 0; i < count; i++) {
    const offset = randomPointInSphere(radius);
    const p = center.clone().add(offset);
    positions.push(p.x, p.y, p.z);
    basePositions.push(p);

    // Alterna ampiezze e fasi per creare uno sfasamento
    const isEven = i % 2 === 0;
    amp.push((isEven ? oscAmp * 2 : oscAmp * 3) + Math.random() * oscAmp); // Ampiezza più estrema
    freq.push((isEven ? oscFreq * 1.5 : oscFreq * 2) + Math.random() * oscFreq); // Frequenza variabile
    phase.push((isEven ? 0 : Math.PI / 2) + Math.random() * Math.PI); // Sfasamento alternato
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('amp', new THREE.Float32BufferAttribute(amp, 1));
  geometry.setAttribute('freq', new THREE.Float32BufferAttribute(freq, 1));
  geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phase, 1));

  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: color },
      opacity: { value: opacity },
      baseSize: { value: size }
    },
    vertexShader: `
      uniform float time;
      uniform float baseSize;
      attribute float amp;
      attribute float freq;
      attribute float phase;
      varying float vAlpha;
      void main() {
        float offset = sin(time * freq + phase) * amp;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (baseSize + offset) * (500.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
        vAlpha = 1.0 - offset * 2.0;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float opacity;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float alpha = (1.0 - d * 2.0) * opacity * vAlpha;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const cloud = new THREE.Points(geometry, shaderMaterial);
  cloud.userData = {
    basePositions,
    amp,
    freq,
    phase,
    baseColor: color.clone(),
    isZoneShader: true
  };

  scene.add(cloud);
  zonePointClouds.push(cloud);
}

// === POINT CLOUD ===
function createPointCloud(mesh, color, totalPoints, ampScale = 1, speedScale = 1) {
  const sampler = new MeshSurfaceSampler(mesh).build();
  const tempVec = new THREE.Vector3();

  const positions = [], basePositions = [], colors = [];
  const ampX = [], ampY = [], ampZ = [];
  const freqX = [], freqY = [], freqZ = [];
  const phaseX = [], phaseY = [], phaseZ = [];
  const offsets = [];

  const isDetached = [];
  const targetPositions = [];
  const detachmentTime = [];
  const attractionStrengthArr = [];

  for (let i = 0; i < totalPoints; i++) {
    sampler.sample(tempVec);
    mesh.localToWorld(tempVec);

    basePositions.push(tempVec.x, tempVec.y, tempVec.z);
    positions.push(tempVec.x, tempVec.y, tempVec.z);
    colors.push(color.r, color.g, color.b);

    ampX.push((Math.random() * 0.1 + 0.05) * ampScale);
    ampY.push((Math.random() * 0.1 + 0.05) * ampScale);
    ampZ.push((Math.random() * 0.1 + 0.05) * ampScale);

    freqX.push((Math.random() * 3 + 1) * speedScale);
    freqY.push((Math.random() * 3 + 1) * speedScale);
    freqZ.push((Math.random() * 3 + 1) * speedScale);

    phaseX.push(Math.random() * Math.PI * 2);
    phaseY.push(Math.random() * Math.PI * 2);
    phaseZ.push(Math.random() * Math.PI * 2);

    offsets.push(new THREE.Vector3());

    isDetached.push(false);
    targetPositions.push(new THREE.Vector3(tempVec.x, tempVec.y, tempVec.z));
    detachmentTime.push(0);
    attractionStrengthArr.push(0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

 const material = new THREE.PointsMaterial({
  size: 0.005 * ampScale,
  vertexColors: true,
  sizeAttenuation:true,
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending, // 💥 Glow effect
  depthWrite: false                // evita z-fighting
});


  const points = new THREE.Points(geometry, material);
  scene.add(points);

  pointClouds.push({
    geometry,
    basePositions,
    ampX, ampY, ampZ,
    freqX, freqY, freqZ,
    phaseX, phaseY, phaseZ,
    offsets,
    material,
    isDetached,
    targetPositions,
    detachmentTime,
    attractionStrengthArr
  });
}
//vale per i modelli/7/

function createFloatingCloud({
  count = 800,
  areaSize = 30,
  minSize = 0.08,
  maxSize = 0.15,
  palette = mainColorPalette,
  emission = 1 // Flag per controllare l'emissione
} = {}) {
  const positions = [];
  const colors = [];
  const sizes = new Float32Array(count);
  const amp = new Float32Array(count);
  const freq = new Float32Array(count);
  const phase = new Float32Array(count);
  const basePositions = [];

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * areaSize;
    const y = (Math.random() - 0.5) * areaSize;
    const z = (Math.random() - 0.5) * areaSize;
    positions.push(x, y, z);
    basePositions.push(new THREE.Vector3(x, y, z));

    const col = palette[Math.floor(Math.random() * palette.length)];
    colors.push(col.r, col.g, col.b);

    sizes[i] = minSize + Math.random() * (maxSize - minSize);
    amp[i] = (0.2 + Math.random() * 0.4) * emission; // Ampiezza influenzata da emission
    freq[i] = (0.5 + Math.random() * 1.5) * emission; // Frequenza influenzata da emission
    phase[i] = Math.random() * Math.PI * 2; // Fase iniziale
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

  // ✅ Texture circolare dinamica via canvas
  const discTexture = new THREE.CanvasTexture(generateCircleTexture());
  discTexture.minFilter = THREE.LinearFilter;
  discTexture.magFilter = THREE.LinearFilter;
  discTexture.generateMipmaps = false;

  const material = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    map: discTexture,
    alphaTest: 0.01,
    depthWrite: false
  });

  const cloud = new THREE.Points(geometry, material);
  scene.add(cloud);

  pointClouds.push({
    geometry,
    material,
    basePositions,
    amp,
    freq,
    phase,
    userData: { isFloatingCloud: true }
  });

  // Aggiungi animazione per il movimento dei punti
  function animateFloatingCloud() {
    const positions = geometry.attributes.position.array;

    for (let i = 0; i < count; i++) {
      const basePos = basePositions[i];
      const time = performance.now() * 0.0002; // Riduci la velocità del tempo

      // Movimento sinusoidale indipendente per ogni punto
      positions[i * 3] = basePos.x + Math.sin(time * freq[i] + phase[i]) * amp[i] * 2; // Oscillazione lenta lungo X
      positions[i * 3 + 1] = basePos.y + Math.cos(time * freq[i] + phase[i]) * amp[i] * 2; // Oscillazione lenta lungo Y
      positions[i * 3 + 2] = basePos.z + Math.sin(time * freq[i] + phase[i]) * amp[i]; // Oscillazione lenta lungo Z
    }

    geometry.attributes.position.needsUpdate = true; // Segnala che la posizione è stata aggiornata
    requestAnimationFrame(animateFloatingCloud); // Continua l'animazione
  }

  animateFloatingCloud(); // Avvia l'animazione
}

// Esempio di utilizzo con emission
createFloatingCloud({
  count: 2000,
  areaSize: 20,
  minSize: 0.08,
  maxSize: 0.15,
  palette: mainColorPalette,
  emission: 1.5 // Aumenta l'intensità del movimento
});

function generateCircleTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0.0, 'rgba(255,255,255,1)');
  gradient.addColorStop(1.0, 'rgba(75, 59, 196, 0)');

  ctx.fillStyle = gradient;
  ctx.fill();

  return canvas;
}

////////MAGNETE//////////
function deformModelWithMouse({
  attractionStrength = 0.009,
  influenceRadius = 0.9,
  returnSpeed = 0.01
} = {}) {

  if (!magnetActive) return; 
  const t = performance.now() / 1000;

  pointClouds.forEach((pc) => {
    // Skip se non è un modello con basePositions in formato Float32Array
    if (!pc.basePositions || typeof pc.basePositions[0] !== 'number') return;
  

    const positions = pc.geometry.attributes.position.array;
    const basePositions = pc.basePositions;
    const targetPositions = pc.targetPositions;
    const isDetached = pc.isDetached;
    const attractionStrengthArr = pc.attractionStrengthArr;

    for (let i = 0; i < positions.length; i += 3) {
      const idx = i / 3;

      const bx = basePositions[i];
      const by = basePositions[i + 1];
      const bz = basePositions[i + 2];

      const harmonic = new THREE.Vector3(
        bx + Math.sin(pc.freqX[idx] * t + pc.phaseX[idx]) * pc.ampX[idx],
        by + Math.sin(pc.freqY[idx] * t + pc.phaseY[idx]) * pc.ampY[idx],
        bz + Math.sin(pc.freqZ[idx] * t + pc.phaseZ[idx]) * pc.ampZ[idx]
      );

      const pos = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
      const dist = pos.distanceTo(mouse3D);

      if (dist < influenceRadius) {
        const influence = Math.max(0, 1 - dist / influenceRadius);
        targetPositions[idx] = mouse3D.clone();
        attractionStrengthArr[idx] = influence * attractionStrength;

        const pull = new THREE.Vector3().subVectors(targetPositions[idx], pos)
          .normalize().multiplyScalar(attractionStrengthArr[idx]);
        pos.add(pull);
      } else {
        if (!isDetached[idx]) {
          targetPositions[idx] = harmonic.clone();
        }

        const returnVec = new THREE.Vector3().subVectors(harmonic, pos).multiplyScalar(returnSpeed);
        pos.add(returnVec);
      }

      positions[i] = pos.x;
      positions[i + 1] = pos.y;
      positions[i + 2] = pos.z;
    }

    pc.geometry.attributes.position.needsUpdate = true;
  });
}

/////////////////////////


// Carica i modelli principali
modelConfigs.forEach(config => {
  loadModelWithColors(config.url, config.baseColor, config.duplicateColor, config.points, config.scale);
});

// Carica i modelli tentacolari
tntModels.forEach(url => {
  loadModelWithColors(url, tntConfig.baseColor, tntConfig.duplicateColor, tntConfig.points, tntConfig.scale);
});
/////////////////////////////////

function divideTentacleIntoSections(mesh, numSections = 8) {
  const sampler = new MeshSurfaceSampler(mesh).build();
  const tempVec = new THREE.Vector3();

  const sections = Array.from({ length: numSections }, () => ({
    positions: [],
    basePositions: [],
    amp: [],
    freq: [],
    phase: []
  }));

  const totalPoints = 10000; // Numero totale di punti
  for (let i = 0; i < totalPoints; i++) {
    sampler.sample(tempVec);
    mesh.localToWorld(tempVec);

    // Determina la sezione in base alla posizione Y
    const sectionIndex = Math.floor((tempVec.y + 1) / 2 * numSections); // Normalizza Y tra 0 e numSections
    const section = sections[Math.min(sectionIndex, numSections - 1)];

    section.positions.push(tempVec.x, tempVec.y, tempVec.z);
    section.basePositions.push(tempVec.clone());
    section.amp.push(THREE.MathUtils.randFloat(0.5, 1.5) * (sectionIndex % 2 === 0 ? 3 : 5)); // Ampiezza esagerata
    section.freq.push(THREE.MathUtils.randFloat(1.0, 2.0)); // Frequenza oscillazione
    section.phase.push(Math.random() * Math.PI * 2); // Fase iniziale
  }

  return sections;
}


function animateTentacleSections() {
  const t = performance.now() / 1000;

  pointClouds.forEach(pc => {
    if (pc.userData?.isTentacleSection) {
      const pos = pc.geometry.attributes.position.array;

      for (let i = 0; i < pc.basePositions.length; i++) {
        const base = pc.basePositions[i];
        const offset = Math.sin(t * pc.freq[i] + pc.phase[i]) * pc.amp[i];

        const idx = i * 3;
        pos[idx] = base.x + offset * 5; // Movimento lungo X
        pos[idx + 1] = base.y + offset * 8; // Movimento lungo Y
        pos[idx + 2] = base.z + offset * 3; // Movimento lungo Z
      }

      pc.geometry.attributes.position.needsUpdate = true;
    }
  });
}


const modules = []; // Array per contenere le mesh dei moduli principali

// Carica i moduli e aggiungi solo le mesh
loader.load('mod/CALOTTA.glb', (gltf) => {
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      modules.push(child); // Aggiungi solo le mesh
      child.visible = false;
    }
  });
  scene.add(gltf.scene);
});

loader.load('mod/testa.glb', (gltf) => {
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      modules.push(child); // Aggiungi solo le mesh
      child.visible = false;
    }
  });
  scene.add(gltf.scene);
});

tntModels.forEach((url) => {
  loader.load(url, (gltf) => {
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        modules.push(child); // Aggiungi solo le mesh
        child.visible = false;
      }
    });
    scene.add(gltf.scene);
  });
});


const modelShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    baseColor: { value: new THREE.Color(0x4682EB) }
  },
  vertexShader: `
    uniform float time;
    varying vec3 vColor;
    void main() {
      vec3 transformed = position;
      transformed.x += sin(time + position.y) * 0.1;
      transformed.z += cos(time + position.x) * 0.1;
      vColor = vec3(0.5 + 0.5 * sin(time), 0.5, 1.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, .0);
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    void main() {
      gl_FragColor = vec4(vColor, 1.0);
    }
  `,
  transparent: true
});

const noiseCloudShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    baseSize: { value: 0.1 },
    color: { value: new THREE.Color(0xFFFFFF) }
  },
  vertexShader: `
    uniform float time;
    uniform float baseSize;
    void main() {
      vec3 transformed = position;
      transformed.x += sin(time + position.y) * 0.1; // Ridotto il movimento
      transformed.z += cos(time + position.x) * 0.1; // Ridotto il movimento
      gl_PointSize = baseSize * (300.0 / -modelViewMatrix[3][2]); // Usa direttamente la profondità
      gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard; // Mantieni il bordo circolare
      gl_FragColor = vec4(color, 0.5); // Opacità ridotta
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

const clickableZoneShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color(0xFF3366) },
    sizeMultiplier: { value: 2.0 } // Aggiunto un moltiplicatore per la dimensione
  },
  vertexShader: `
    uniform float time;
    uniform float sizeMultiplier;
    void main() {
      vec3 transformed = position;
      transformed.y += sin(time + position.x) * 0.05;
      gl_PointSize = 10.0 * sizeMultiplier; // Ingrandito il punto
      gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard; // Mantieni il bordo circolare
      gl_FragColor = vec4(color, 1.0);
    }
  `,
  transparent: true
});

let pointCount = 20000; // Numero iniziale di punti

window.addEventListener('wheel', (e) => {
  const delta = e.deltaY > 0 ? 1000 : -1000; // Aumenta o diminuisci i punti
  pointCount = Math.max(10000, pointCount + delta); // Limita il numero minimo di punti
});

function updateModelPointCloud(mesh, newPointCount) {
  const sampler = new MeshSurfaceSampler(mesh).build();
  const tempVec = new THREE.Vector3();

  // Recupera la geometria esistente o creane una nuova
  let pointCloud = pointClouds.find(pc => pc.mesh === mesh);
  let positions = [];

  if (pointCloud) {
    // Se esiste, copia i punti esistenti
    positions = Array.from(pointCloud.geometry.attributes.position.array);
  }

  const currentPointCount = positions.length / 3;

  if (newPointCount > currentPointCount) {
    // Aggiungi nuovi punti
    for (let i = currentPointCount; i < newPointCount; i++) {
      sampler.sample(tempVec);
      
      mesh.localToWorld(tempVec);
      positions.push(tempVec.x, tempVec.y, tempVec.z);
    }
  } else if (newPointCount < currentPointCount) {
    // Rimuovi punti in eccesso
    positions = positions.slice(0, newPointCount * 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  if (pointCloud) {
    // Aggiorna la geometria esistente
    pointCloud.geometry.dispose();
    pointCloud.geometry = geometry;
    pointCloud.geometry.attributes.position.needsUpdate = true;
  } else {
    // Crea un nuovo point cloud
    const material = new THREE.PointsMaterial({
      size: 0.005,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    pointClouds.push({
      mesh,
      geometry,
      material
    });
  }
}
const noiseCloudMaterial = new THREE.PointsMaterial({
  size: 0.05,
  vertexColors: true, // Abilita i colori per i punti
  transparent: true,
  opacity: 0.8,
});

// Funzione per aggiornare i punti della noise cloud con movimento indipendente
function updateNoiseCloud(mesh, newPointCount) {
  const sampler = new MeshSurfaceSampler(mesh).build();
  const tempVec = new THREE.Vector3();

  let positions = [];
  let colors = [];
  const color = new THREE.Color();

  for (let i = 0; i < newPointCount; i++) {
    sampler.sample(tempVec);
    mesh.localToWorld(tempVec);

    // Movimento indipendente basato su oscillazioni sinusoidali
    tempVec.x += Math.sin(i * 0.1 + performance.now() * 0.001) * 5; // Oscillazione lungo X
    tempVec.y += Math.cos(i * 0.1 + performance.now() * 0.001) * 0.5; // Oscillazione lungo Y
    tempVec.z += Math.sin(i * 0.2 + performance.now() * 0.001) * 0.3; // Oscillazione lungo Z

    positions.push(tempVec.x, tempVec.y, tempVec.z);

    // Cambia dinamicamente il colore dei punti
    color.setHSL((i / newPointCount + performance.now() * 0.0001) % 1, 0.7, 0.5);
    colors.push(color.r, color.g, color.b);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); // Aggiungi colori dinamici
  mesh.geometry = geometry;
}

// Funzione di animazione per aggiornare continuamente la noise cloud
function animateNoiseCloud() {
  modules.forEach(mesh => {
    if (mesh.userData.isNoiseCloud) {
      updateNoiseCloud(mesh, 20000); // Aggiorna i punti della noise cloud
    }
  });

  requestAnimationFrame(animateNoiseCloud); // Continua l'animazione
}

// Materiale per la noise cloud con supporto per i colori dinamici


// Avvia l'animazione della noise cloud
animateNoiseCloud();

// Aggiorna i punti della noise cloud e dei modelli
const newPointCount = 20000; // Numero desiderato di punti
modules.forEach(mesh => {
  if (mesh.userData.isNoiseCloud) {
    updateNoiseCloud(mesh, newPointCount); // Aggiorna i punti della noise cloud
  } else {
    updateModelPointCloud(mesh, newPointCount); // Aggiorna i punti degli altri modelli
  }
});

// Debounce per limitare la frequenza degli aggiornamenti
let scrollTimeout;
window.addEventListener('wheel', (e) => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    const delta = e.deltaY > 0 ? 1000 : -1000;
    const newPointCount = Math.max(10000, pointCount + delta);
    pointCount = newPointCount;

    // Aggiorna i punti dei modelli
    modules.forEach(mesh => {
      updateModelPointCloud(mesh, newPointCount);
    });
  }, 100); // Aggiorna ogni 100ms
});

function animate() {
  requestAnimationFrame(animate);

  const t = performance.now() / 1000;

  // Aggiorna i materiali degli shader
  modelShaderMaterial.uniforms.time.value = t;
  clickableZoneShaderMaterial.uniforms.time.value = t;
  noiseCloudShaderMaterial.uniforms.time.value = t;

  animateTentacleSections(); // Aggiorna il movimento dei tentacoli
  deformModelWithMouse(); // Deformazione con il mouse
  animateTentacleSections();
  

  controls.update();
  renderer.render(scene, camera);
}

animate();

modules.forEach(mesh => {
  updateModelPointCloud(mesh, newPointCount);
});

let audioContext;
let gainNode;
let oscillator;
let delayNode; // Nodo per il delay
let convolver; // Nodo per il riverbero
let mouseMoveEnabled = false; // Stato per abilitare il controllo del mouse dopo 3 secondi
let patternInterval; // Per gestire il loop del pattern

// Scala eolia (alzata di un'ottava)
const aeolianScale = [0, 2, 3, 5, 7, 8, 10]; // Scala eolia in semitoni
const baseNote = 440; // Nota base alzata di un'ottava (A3)
const scaleNotes = aeolianScale.map(semitone => baseNote * Math.pow(2, semitone / 12));

// Funzione per generare un impulso di riverbero (aumentato)
function generateReverbImpulse(audioContext, duration = 3.0, decay = 2.0) {
  const sampleRate = audioContext.sampleRate;
  const length = sampleRate * duration;
  const impulse = audioContext.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = length - i;
    left[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
    right[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
  }

  return impulse;
}

// Funzione per applicare un envelope ADSR
function applyADSR(gainNode, attack = 1.0, decay = 0.5, sustain = 0.2, release = 4.0) {
  const now = audioContext.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(0, now); // Inizio a 0
  gainNode.gain.linearRampToValueAtTime(0.5, now + attack); // Attacco con volume massimo ridotto
  gainNode.gain.linearRampToValueAtTime(sustain, now + attack + decay); // Decadimento
  gainNode.gain.setTargetAtTime(0, now + attack + decay + sustain, release); // Rilascio lungo
}

// Funzione per generare un pattern euclideo
function generateEuclideanPattern(steps, pulses) {
  const pattern = [];
  let counts = Array(pulses).fill(1).concat(Array(steps - pulses).fill(0));
  while (counts.length > 1) {
    const min = Math.min(counts[0], counts[counts.length - 1]);
    if (min === 0) {
      pattern.push(...counts.splice(0, 1));
    } else {
      counts[counts.length - 1] -= min;
      pattern.push(...counts.splice(0, 1));
    }
  }
  pattern.push(...counts);
  return pattern;
}

// Pattern euclideo di tre note
const euclideanPattern = generateEuclideanPattern(8, 3); // 8 step, 3 note attive

// Funzione per suonare il micro pattern
function playMicroPattern() {
  let step = 0;

  patternInterval = setInterval(() => {
    if (!audioContext || audioContext.state !== 'running') return;

    if (euclideanPattern[step % euclideanPattern.length] === 1) {
      const noteIndex = step % scaleNotes.length;
      const frequency = scaleNotes[noteIndex];

      // Cambia la frequenza dell'oscillatore
      if (oscillator) {
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      }

      // Applica un breve envelope ADSR per ogni nota
      if (gainNode) {
        applyADSR(gainNode, 0.1, 0.1, 0.2, 0.3); // Breve attacco e rilascio
      }
    }

    step++;
  }, 200); // Ogni step dura 200ms
}

// Funzione per suonare una nota con timeout
function playNoteWithTimeout(frequency) {
  if (!audioContext || !gainNode || !oscillator) return;

  // Cambia la frequenza dell'oscillatore
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

  // Applica un envelope ADSR
  applyADSR(gainNode, 0.1, 0.2, 0.3, 0.5); // Envelope breve

  // Imposta un timeout per fermare il suono dopo 3 secondi
  setTimeout(() => {
    if (gainNode) {
      gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.5); // Rilascio morbido
    }
  }, 3000);
}

// Listener per attivare il suono al primo click
window.addEventListener('click', (e) => {
  if (!audioContext) {
    // Inizializza AudioContext e nodi audio
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);

    delayNode = audioContext.createDelay();
    delayNode.delayTime.value = 0.3;

    convolver = audioContext.createConvolver();
    convolver.buffer = generateReverbImpulse(audioContext, 3.0, 2.0); // Riverbero aumentato

    const feedbackGain = audioContext.createGain();
    feedbackGain.gain.setValueAtTime(0.1, audioContext.currentTime);
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode);

    gainNode.connect(delayNode);
    delayNode.connect(convolver);
    convolver.connect(audioContext.destination);

    oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // Nota base (A3)
    oscillator.connect(gainNode);
    oscillator.start();
  } else if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  // Suona una nota con timeout
  const randomNote = scaleNotes[Math.floor(Math.random() * scaleNotes.length)];
  playNoteWithTimeout(randomNote);
});

// Listener per il movimento del mouse
window.addEventListener('mousemove', (e) => {
  if (!audioContext || audioContext.state !== 'running') return;

  // Normalizza le coordinate del mouse rispetto alla finestra
  const normalizedX = e.clientX / window.innerWidth; // Normalizza X tra 0 e 1
  const normalizedY = e.clientY / window.innerHeight; // Normalizza Y tra 0 e 1

  // Calcola la frequenza in base alla posizione X
  const noteIndex = Math.floor(normalizedX * scaleNotes.length);
  const frequency = scaleNotes[noteIndex % scaleNotes.length]; // Cicla attraverso la scala

  // Cambia la frequenza dell'oscillatore
  if (oscillator) {
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  }

  // Cambia il ritardo del delay in base alla posizione Y
  if (delayNode) {
    delayNode.delayTime.setValueAtTime(normalizedY * 0.5, audioContext.currentTime); // Ritardo tra 0 e 500ms
  }
});

// Listener per terminare il suono al rilascio del mouse
window.addEventListener('mouseup', () => {
  // Non chiudere immediatamente il suono, lascia che il rilascio morbido dell'ADSR faccia il suo lavoro
  if (gainNode) {
    applyADSR(gainNode, 0, 0, 1.5, 4.0); // Solo rilascio lungo
  }

  // Ferma il micro pattern
  if (patternInterval) {
    clearInterval(patternInterval);
    patternInterval = null;
  }
});


