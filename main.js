import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
// Import Papa Parse as a regular script
import './js/papaparse.js';
// Use the global Papa object

let scene, camera, renderer, controls;
let acParticles, windowParticles;
let acVelocities, windowVelocities; // Add velocity arrays
let simulationData = [];
let currentDataIndex = 0;
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 5000; // 5 seconds in milliseconds
let acUnit, windowMesh; // Add these variables to store references to the meshes
let windowCenter, windowSize; // Add these as global variables
// Track loading status
let modelLoaded = false;
let dataLoaded = false;

// Initialize the scene
function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x808080);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 3, 5);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Load the room model
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    // Use CDN for Vercel deployment
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);

    loader.load(
        'room_ac_model.compressed.glb', 
        (gltf) => {
            scene.add(gltf.scene);
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Store references to AC unit and window
                    if (child.name.startsWith('AC_')) {
                        acUnit = child;
                    }
                    if (child.name === 'Window') {
                        windowMesh = child;
                    }
                    if (child.name === 'Room') {
                        // Make room walls transparent
                        child.material.side = THREE.DoubleSide;
                        child.material.transparent = true;
                        child.material.opacity = 0.2;
                        child.material.depthWrite = false; // Ensures proper transparency
                    }
                }
            });
            initParticleSystems();
            console.log('Model loaded successfully!');
            modelLoaded = true;
            checkAllLoaded();
        },
        // Progress callback
        (xhr) => {
            const progressPercent = Math.round((xhr.loaded / xhr.total) * 100);
            document.getElementById('loading-progress').textContent = `${progressPercent}%`;
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        // Error callback
        (error) => {
            console.error('Error loading model:', error);
            // Display error message and hide loader
            document.getElementById('loading-screen').classList.add('fade-out');
            // Display error message to user
            const errorDiv = document.createElement('div');
            errorDiv.style.position = 'absolute';
            errorDiv.style.top = '50%';
            errorDiv.style.left = '50%';
            errorDiv.style.transform = 'translate(-50%, -50%)';
            errorDiv.style.background = 'rgba(0,0,0,0.7)';
            errorDiv.style.color = 'white';
            errorDiv.style.padding = '20px';
            errorDiv.style.borderRadius = '10px';
            errorDiv.innerHTML = '<h3>Error loading 3D model</h3><p>Please try refreshing the page.</p>';
            document.body.appendChild(errorDiv);
        }
    );

    // Load simulation data
    loadSimulationData();

    // Handle window resizing
    window.addEventListener('resize', onWindowResize, false);
}

function initParticleSystems() {
    if (!acUnit || !windowMesh) {
        console.error('AC unit or window mesh not found in the model');
        return;
    }

    // Get AC unit's world position and dimensions
    const acBox = new THREE.Box3().setFromObject(acUnit);
    const acCenter = new THREE.Vector3();
    acBox.getCenter(acCenter);
    const acSize = new THREE.Vector3();
    acBox.getSize(acSize);

    // AC particles
    const acGeometry = new THREE.BufferGeometry();
    const acParticleCount = 2000; // Increased particle count
    const acPositions = new Float32Array(acParticleCount * 3);
    acVelocities = new Float32Array(acParticleCount * 3);

    for (let i = 0; i < acParticleCount; i++) {
        const i3 = i * 3;
        // Initialize positions at the AC unit
        acPositions[i3] = acCenter.x + (Math.random() - 0.5) * acSize.x * 0.8;
        acPositions[i3 + 1] = acBox.min.y;
        acPositions[i3 + 2] = acCenter.z + (Math.random() - 0.5) * acSize.z * 0.8;

        // Initialize velocities with random directions
        acVelocities[i3] = (Math.random() - 0.5) * 0.02;     // x velocity
        acVelocities[i3 + 1] = -Math.random() * 0.04;        // y velocity (mainly downward)
        acVelocities[i3 + 2] = (Math.random() - 0.5) * 0.02; // z velocity
    }

    acGeometry.setAttribute('position', new THREE.BufferAttribute(acPositions, 3));
    const acMaterial = new THREE.PointsMaterial({
        color: 0x00ffff,
        size: 0.03,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending // Add this for better particle effect
    });

    acParticles = new THREE.Points(acGeometry, acMaterial);
    scene.add(acParticles);

    // Window particles
    const windowGeometry = new THREE.BufferGeometry();
    const windowParticleCount = 3000;
    const windowPositions = new Float32Array(windowParticleCount * 3);
    windowVelocities = new Float32Array(windowParticleCount * 3);

    // Get precise window dimensions
    let windowBox = new THREE.Box3().setFromObject(windowMesh);
    let windowCenter = new THREE.Vector3();
    let windowSize = new THREE.Vector3();
    windowBox.getCenter(windowCenter);
    windowBox.getSize(windowSize);

    const scatterRadius = 0.4; // Increased scatter radius
    const baseSpeed = 0.015; // Slightly increased base speed
    const roomDepth = 1.5; // Distance particles can travel into/out of room

    for (let i = 0; i < windowParticleCount; i++) {
        const i3 = i * 3;
        const isInflow = i < windowParticleCount / 2;

        // Create scattered positions around the window
        const theta = Math.random() * Math.PI * 2; // Random angle
        const scatter = Math.random() * scatterRadius; // Random scatter distance
        const depth = Math.random() * roomDepth; // Random depth into/out of room

        // Initialize positions with scatter and depth
        windowPositions[i3] = isInflow ? 
            windowBox.min.x - depth : // Start outside with varying depth
            windowBox.min.x + depth;  // Start inside with varying depth
        windowPositions[i3 + 1] = windowBox.min.y + Math.random() * windowSize.y;
        windowPositions[i3 + 2] = windowBox.min.z + Math.random() * windowSize.z;

        // Add scatter to positions
        windowPositions[i3 + 1] += Math.sin(theta) * scatter;
        windowPositions[i3 + 2] += Math.cos(theta) * scatter;

        // Initialize velocities with more variation and stronger directional movement
        const randomAngle = Math.random() * Math.PI * 2;
        const verticalBias = (Math.random() - 0.5) * 0.01;
        const directionStrength = 0.7; // Bias towards inward/outward movement

        // Calculate scattered velocities with stronger directional component
        windowVelocities[i3] = isInflow ? 
            baseSpeed * (directionStrength + Math.random() * 0.3) : // Stronger inward
            -baseSpeed * (directionStrength + Math.random() * 0.3);  // Stronger outward
        windowVelocities[i3 + 1] = verticalBias + Math.sin(randomAngle) * baseSpeed * 0.4;
        windowVelocities[i3 + 2] = Math.cos(randomAngle) * baseSpeed * 0.4;
    }

    windowGeometry.setAttribute('position', new THREE.BufferAttribute(windowPositions, 3));
    const windowMaterial = new THREE.PointsMaterial({
        color: 0x88ff88,
        size: 0.02,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
    });

    windowParticles = new THREE.Points(windowGeometry, windowMaterial);
    scene.add(windowParticles);
}

function loadSimulationData() {
    fetch('ac_input_dynamic_balanced.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then(csvText => {
            Papa.parse(csvText, {
                header: true,
                complete: (results) => {
                    if (results.data && results.data.length > 0) {
                        console.log(`Successfully loaded ${results.data.length} simulation data rows`);
                        simulationData = results.data.filter(row => 
                            // Filter out empty rows or rows without required data
                            row.Time && (row['AC State'] !== undefined || row['Window State'] !== undefined)
                        );
                        updateSimulationDisplay(simulationData[0]);
                        dataLoaded = true;
                        checkAllLoaded();
                    } else {
                        console.error("CSV parsing completed but no valid data found");
                        // Use fallback data
                        simulationData = [
                            { Time: "00:00", "AC State": "1", "Window State": "0", "AC Temperature (°C)": "24", "room temperature": "28" }
                        ];
                        updateSimulationDisplay(simulationData[0]);
                        dataLoaded = true;
                        checkAllLoaded();
                    }
                },
                error: (error) => {
                    console.error("CSV parsing error:", error);
                    // Use fallback data
                    simulationData = [
                        { Time: "00:00", "AC State": "1", "Window State": "0", "AC Temperature (°C)": "24", "room temperature": "28" }
                    ];
                    updateSimulationDisplay(simulationData[0]);
                    dataLoaded = true;
                    checkAllLoaded();
                }
            });
        })
        .catch(error => {
            console.error("Error loading simulation data:", error);
            // Fallback to sample data if loading fails
            simulationData = [
                { Time: "00:00", "AC State": "1", "Window State": "0", "AC Temperature (°C)": "24", "room temperature": "28" }
            ];
            updateSimulationDisplay(simulationData[0]);
            dataLoaded = true;
            checkAllLoaded();
        });
}

// New function to check if all resources are loaded
function checkAllLoaded() {
    if (modelLoaded && dataLoaded) {
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('fade-out');
        }, 500);
    }
}

function updateParticles() {
    if (!acParticles || !windowParticles || !acUnit || !windowMesh) return;

    const currentTime = Date.now();
    if (currentTime - lastUpdateTime > UPDATE_INTERVAL) {
        const data = simulationData[currentDataIndex];
        updateSimulationDisplay(data);
        currentDataIndex = (currentDataIndex + 1) % simulationData.length;
        lastUpdateTime = currentTime;
    }

    const acBox = new THREE.Box3().setFromObject(acUnit);
    const windowBox = new THREE.Box3().setFromObject(windowMesh);
    
    // Create new Vector3 instances for window center and size
    windowCenter = new THREE.Vector3();
    windowSize = new THREE.Vector3();
    windowBox.getCenter(windowCenter);
    windowBox.getSize(windowSize);

    // Update AC particles
    const acPositions = acParticles.geometry.attributes.position.array;
    
    for (let i = 0; i < acPositions.length; i += 3) {
        if (simulationData[currentDataIndex]['AC State'] === '1') {
            // Apply velocity
            acPositions[i] += acVelocities[i];
            acPositions[i + 1] += acVelocities[i + 1];
            acPositions[i + 2] += acVelocities[i + 2];

            // Add some turbulence
            acVelocities[i] += (Math.random() - 0.5) * 0.002;
            acVelocities[i + 1] += (Math.random() - 0.5) * 0.002;
            acVelocities[i + 2] += (Math.random() - 0.5) * 0.002;

            // Reset if particle goes too far
            if (acPositions[i + 1] < 0 || 
                Math.abs(acPositions[i] - acBox.min.x) > 2 || 
                Math.abs(acPositions[i + 2] - acBox.min.z) > 2) {
                // Reset position
                acPositions[i] = acBox.min.x + Math.random() * (acBox.max.x - acBox.min.x);
                acPositions[i + 1] = acBox.min.y;
                acPositions[i + 2] = acBox.min.z + Math.random() * (acBox.max.z - acBox.min.z);
                // Reset velocity
                acVelocities[i] = (Math.random() - 0.5) * 0.02;
                acVelocities[i + 1] = -Math.random() * 0.04;
                acVelocities[i + 2] = (Math.random() - 0.5) * 0.02;
            }
        }
    }
    acParticles.geometry.attributes.position.needsUpdate = true;

    // Update window particles
    const windowPositions = windowParticles.geometry.attributes.position.array;
    const windowParticleCount = windowPositions.length / 3;
    const airflowSpeed = (parseFloat(simulationData[currentDataIndex]['Airflow Speed (m/s)']) || 0) * 0.5;
    const maxTravelDistance = 2.0; // Maximum distance particles can travel from window

    for (let i = 0; i < windowPositions.length; i += 3) {
        if (simulationData[currentDataIndex]['Window State'] === '1') {
            const isInflow = i < windowParticleCount * 1.5;
            
            // Apply velocity with reduced speed and more scatter
            windowPositions[i] += windowVelocities[i] * airflowSpeed;
            windowPositions[i + 1] += windowVelocities[i + 1] * airflowSpeed;
            windowPositions[i + 2] += windowVelocities[i + 2] * airflowSpeed;

            // Add subtle turbulence
            const turbulence = 0.0003;
            windowVelocities[i] += (Math.random() - 0.5) * turbulence;
            windowVelocities[i + 1] += (Math.random() - 0.5) * turbulence;
            windowVelocities[i + 2] += (Math.random() - 0.5) * turbulence;

            // Reset if particle goes too far
            if (Math.abs(windowPositions[i] - windowBox.min.x) > maxTravelDistance || 
                Math.abs(windowPositions[i + 1] - windowCenter.y) > windowSize.y * 1.2 ||
                Math.abs(windowPositions[i + 2] - windowCenter.z) > windowSize.z * 1.2) {
                
                // Reset with scatter and depth
                const theta = Math.random() * Math.PI * 2;
                const scatter = Math.random() * 0.4;
                const depth = Math.random() * 0.5; // Initial depth when resetting

                windowPositions[i] = isInflow ? 
                    windowBox.min.x - depth : // Reset outside
                    windowBox.min.x + depth;  // Reset inside
                windowPositions[i + 1] = windowBox.min.y + Math.random() * windowSize.y + Math.sin(theta) * scatter;
                windowPositions[i + 2] = windowBox.min.z + Math.random() * windowSize.z + Math.cos(theta) * scatter;

                // Reset velocity with more variation and stronger directional movement
                const baseSpeed = 0.015;
                const randomAngle = Math.random() * Math.PI * 2;
                const verticalBias = (Math.random() - 0.5) * 0.01;
                const directionStrength = 0.7;

                windowVelocities[i] = isInflow ? 
                    baseSpeed * (directionStrength + Math.random() * 0.3) : 
                    -baseSpeed * (directionStrength + Math.random() * 0.3);
                windowVelocities[i + 1] = verticalBias + Math.sin(randomAngle) * baseSpeed * 0.4;
                windowVelocities[i + 2] = Math.cos(randomAngle) * baseSpeed * 0.4;
            }
        }
    }
    windowParticles.geometry.attributes.position.needsUpdate = true;
}

function updateSimulationDisplay(data) {
    document.getElementById('time').textContent = data.Time;
    document.getElementById('ac-state').textContent = data['AC State'] === '1' ? 'ON' : 'OFF';
    document.getElementById('window-state').textContent = data['Window State'] === '1' ? 'OPEN' : 'CLOSED';
    document.getElementById('temperature').textContent = 
        data['AC Temperature (°C)'] ? 
        `${data['AC Temperature (°C)']}°C` : 
        `${data['room temperature']}°C`;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    updateParticles();
    renderer.render(scene, camera);
}

init();
animate();


