import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer, card;
let isLoading = true;
let autoRotate = true;
let targetRotationX = Math.PI / 2; // 90 degrees in radians
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let animateCardRise = true;
let targetY = 0;
let startY = -30;
let enableScrollRotation = false;
let scrollTargetRotationX = Math.PI / 2;

init();

function init() {
    const container = document.getElementById("container3D");
    if (!container) {
        console.error("Container element not found!");
        updateLoadingStatus("Error: Container not found");
        return;
    }

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera setup
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 20);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight2.position.set(-5, -5, 5);
    scene.add(directionalLight2);

    // Load the GLB model
    loadGLBModel();

    // Event listeners
    window.addEventListener("resize", onWindowResize);
    window.addEventListener('scroll', onScroll);
    window.addEventListener('click', onCardClick);
    window.addEventListener('mousemove', onCardHover);

    // Start animation loop
    animate();
}

function loadGLBModel() {
    updateLoadingStatus("Loading Card.glb...");
    
    const loader = new GLTFLoader();
    
    loader.load(
        '/models/Card.glb',
        function (gltf) {
            console.log("Card.glb loaded successfully!");
            updateLoadingStatus("Card loaded successfully!");
            
            card = gltf.scene;
            setCardInitialTransform();
            
            // Get the bounding box to understand the model size
            const box = new THREE.Box3().setFromObject(card);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            // Calculate appropriate scale based on model size
            const maxDimension = Math.max(size.x, size.y, size.z);
            const targetSize = 10;
            const scale = targetSize / maxDimension;
            
            // Apply the calculated scale
            card.scale.set(scale, scale, scale);
            
            // Center the model
            card.position.copy(center).multiplyScalar(-scale);
            
            // Set up materials and shadows
            card.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    
                    if (node.material) {
                        if (node.material.isMeshStandardMaterial || node.material.isMeshLambertMaterial) {
                            node.material.metalness = 0.1;
                            node.material.roughness = 0.3;
                        }
                        if (node.material.transparent && node.material.opacity < 0.1) {
                            node.material.opacity = 1.0;
                            node.material.transparent = false;
                        }
                    } else {
                        node.material = new THREE.MeshStandardMaterial({ 
                            color: 0xff6b6b,
                            metalness: 0.1,
                            roughness: 0.3
                        });
                    }
                }
            });
            
            // Add the card to the scene
            scene.add(card);
            isLoading = false;

            // Fade out the preload text
            const preloadText = document.getElementById('preloadText');
            if (preloadText) {
                preloadText.style.opacity = '0';
                setTimeout(() => { preloadText.style.display = 'none'; }, 700);
            }
            
            // Hide loading indicator
            setTimeout(() => {
                const loadingElement = document.getElementById("loadingText");
                if (loadingElement) {
                    loadingElement.style.opacity = '0';
                    setTimeout(() => {
                        loadingElement.style.display = 'none';
                    }, 500);
                }
            }, 1000);
        },
        function (progress) {
            const percentComplete = (progress.loaded / progress.total) * 100;
            updateLoadingStatus(`Loading Card.glb... ${percentComplete.toFixed(1)}%`);
        },
        function (error) {
            console.error("Failed to load Card.glb:", error);
            updateLoadingStatus("Failed to load Card.glb, creating fallback...");
            createFallbackCard();
        }
    );
}

function createFallbackCard() {
    console.log("Creating fallback business card...");
    
    // Create a business card group
    card = new THREE.Group();
    setCardInitialTransform();
    
    // Card base
    const cardGeometry = new THREE.BoxGeometry(6, 3.5, 0.1);
    const cardMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.2
    });
    const cardMesh = new THREE.Mesh(cardGeometry, cardMaterial);
    cardMesh.castShadow = true;
    cardMesh.receiveShadow = true;
    card.add(cardMesh);
    
    // Add text-like elements
    const textMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    // Company name
    const companyNameGeo = new THREE.BoxGeometry(4, 0.5, 0.02);
    const companyName = new THREE.Mesh(companyNameGeo, textMaterial);
    companyName.position.set(0, 0.8, 0.06);
    card.add(companyName);
    
    // Person name
    const personNameGeo = new THREE.BoxGeometry(3, 0.3, 0.02);
    const personName = new THREE.Mesh(personNameGeo, textMaterial);
    personName.position.set(0, 0.2, 0.06);
    card.add(personName);
    
    // Contact info lines
    for (let i = 0; i < 3; i++) {
        const contactGeo = new THREE.BoxGeometry(2.5, 0.15, 0.02);
        const contact = new THREE.Mesh(contactGeo, textMaterial);
        contact.position.set(0, -0.3 - (i * 0.3), 0.06);
        card.add(contact);
    }
    
    // Logo placeholder
    const logoGeo = new THREE.BoxGeometry(0.8, 0.8, 0.02);
    const logoMaterial = new THREE.MeshStandardMaterial({ color: 0x007acc });
    const logo = new THREE.Mesh(logoGeo, logoMaterial);
    logo.position.set(2, 0.8, 0.06);
    card.add(logo);
    
    // Add card to scene
    scene.add(card);
    isLoading = false;

    // Fade out the preload text for fallback
    const preloadText = document.getElementById('preloadText');
    if (preloadText) {
        preloadText.style.opacity = '0';
        setTimeout(() => { preloadText.style.display = 'none'; }, 700);
    }
    
    console.log("Fallback business card created!");
    updateLoadingStatus("Fallback card created successfully!");
    
    // Hide loading indicator
    setTimeout(() => {
        const loadingElement = document.getElementById("loadingText");
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            setTimeout(() => {
                loadingElement.style.display = 'none';
            }, 500);
        }
    }, 1000);
}

function setCardInitialTransform() {
    if (card) {
        card.rotation.x = Math.PI / 2;
        card.position.y = startY;
    }
}

function updateCardRotation() {
    if (card && enableScrollRotation) {
        // Smoothly interpolate to the scroll target rotation
        card.rotation.x += (scrollTargetRotationX - card.rotation.x) * 0.1;
    }
}

function updateCardRise() {
    if (card && animateCardRise) {
        const diff = targetY - card.position.y;
        if (Math.abs(diff) > 0.05) {
            card.position.y += diff * 0.08;
        } else {
            card.position.y = targetY;
            animateCardRise = false;
            enableScrollRotation = true;
        }
    }
}

function onScroll() {
    if (enableScrollRotation) {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        // Adjust multiplier for sensitivity
        scrollTargetRotationX = Math.PI / 2 + scrollY * 0.01;
    }
}

function onCardClick(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    if (card) {
        // Get all meshes in the card group
        let meshes = [];
        card.traverse((node) => {
            if (node.isMesh) meshes.push(node);
        });
        let intersects = raycaster.intersectObjects(meshes, true);
        if (intersects.length > 0) {
            window.open('https://cal.com/andrew-asante-dwtrqr/', '_blank');
        }
    }
}

function onCardHover(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    if (card) {
        let meshes = [];
        card.traverse((node) => {
            if (node.isMesh) meshes.push(node);
        });
        let intersects = raycaster.intersectObjects(meshes, true);
        if (intersects.length > 0) {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = '';
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    updateCardRise();
    updateCardRotation();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
}

function updateLoadingStatus(message) {
    const loadingElement = document.getElementById("loadingText");
    if (loadingElement) {
        loadingElement.textContent = message;
        console.log("Status:", message);
    }
}

console.log("3D Business Card Script Loaded");