import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/RGBELoader.js";

function loadModel(containerId, modelPath) {
  const container = document.getElementById(containerId);
  
  if (!container) {
    console.error(`Container with id "${containerId}" not found!`);
    return;
  }

  // Ensure container has dimensions
  const width = container.clientWidth || 200;
  const height = container.clientHeight || 200;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    width / height,
    0.1,
    1000
  );
  camera.position.z = 20;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  // HDR lighting
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  new RGBELoader()
    .setDataType(THREE.UnsignedByteType)
    .load(
      "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr",
      (hdrEquirect) => {
        const envMap = pmremGenerator.fromEquirectangular(hdrEquirect).texture;
        scene.environment = envMap;
      }
    );

  // Lights
  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight1.position.set(5, 10, 5);
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight2.position.set(-5, -5, 5);
  scene.add(directionalLight2);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  // Load the model
  const loader = new GLTFLoader();
  loader.load(
    modelPath,
    (gltf) => {
      const model = gltf.scene;

      // Normalize model scale
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxAxis = Math.max(size.x, size.y, size.z);
      model.scale.multiplyScalar(15 / maxAxis);
      box.setFromObject(model);
      box.getCenter(model.position).multiplyScalar(-1);

      model.rotation.x = Math.PI / 2;
      scene.add(model);

      // Animate model rotation
      function animate() {
        requestAnimationFrame(animate);
        model.rotation.z += 0.01;
        renderer.render(scene, camera);
      }
      animate();

      // ✅ Handle container resizing
      window.addEventListener("resize", () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      });
    },
    undefined,
    (err) => console.error(`Error loading ${modelPath}:`, err)
  );
}

// Wait for DOM to be ready before loading models
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initModels);
} else {
  // DOM is already ready
  initModels();
}

function initModels() {
  loadModel("container3D-GREEN", "/models/green.glb");
  loadModel("container3D-BLUE", "/models/blue.glb");
  loadModel("container3D-RED", "/models/red.glb");
}
