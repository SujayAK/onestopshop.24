import * as THREE from 'three';

const PRESETS = {
  subtle: {
    speed: 0.18,
    ringOpacity: 0.45,
    sparkleOpacity: 0.65,
    cameraDrift: 0.07,
    bloomStrength: 0.85
  },
  medium: {
    speed: 0.28,
    ringOpacity: 0.55,
    sparkleOpacity: 0.75,
    cameraDrift: 0.11,
    bloomStrength: 1.05
  },
  bold: {
    speed: 0.38,
    ringOpacity: 0.68,
    sparkleOpacity: 0.85,
    cameraDrift: 0.15,
    bloomStrength: 1.25
  }
};

function detectWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return Boolean(context);
  } catch (_error) {
    return false;
  }
}

function getDevicePixelRatio() {
  const ratio = window.devicePixelRatio || 1;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  return Math.min(ratio, isMobile ? 1.4 : 1.8);
}

function createSparkles(count = 220) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const stride = i * 3;
    positions[stride] = (Math.random() - 0.5) * 18;
    positions[stride + 1] = (Math.random() - 0.5) * 14;
    positions[stride + 2] = (Math.random() - 0.5) * 12;

    // Soft pastel sparkle colors
    const hue = Math.random() > 0.5 ? 0.92 : 0.75; // pinkish / lavender
    const color = new THREE.Color().setHSL(hue, 0.6, 0.95);
    colors[stride] = color.r;
    colors[stride + 1] = color.g;
    colors[stride + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  return geometry;
}

function createHearts(count = 18) {
  const group = new THREE.Group();

  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, 0.24);
  heartShape.bezierCurveTo(0, 0.52, -0.42, 0.52, -0.42, 0.24);
  heartShape.bezierCurveTo(-0.42, 0.02, -0.2, -0.12, 0, -0.34);
  heartShape.bezierCurveTo(0.2, -0.12, 0.42, 0.02, 0.42, 0.24);
  heartShape.bezierCurveTo(0.42, 0.52, 0, 0.52, 0, 0.24);

  const heartGeometry = new THREE.ShapeGeometry(heartShape);

  for (let i = 0; i < count; i++) {
    const tone = i % 3;
    const color = tone === 0 ? 0xff8cc9 : tone === 1 ? 0xffb3de : 0xf6a9ff;
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.2,
      roughness: 0.35,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide
    });

    const heart = new THREE.Mesh(heartGeometry, material);
    const scale = 0.16 + Math.random() * 0.2;
    heart.scale.set(scale, scale, scale);
    heart.position.set(
      (Math.random() - 0.5) * 9,
      (Math.random() - 0.5) * 7,
      -2 + Math.random() * 4
    );
    heart.userData.floatSeed = Math.random() * Math.PI * 2;
    heart.userData.floatSpeed = 0.45 + Math.random() * 0.45;
    heart.userData.floatAmp = 0.05 + Math.random() * 0.08;
    group.add(heart);
  }

  return group;
}

export function initCuteGirlyBackground({ intensity = 'medium' } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { destroy: () => {} };
  }

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const preset = PRESETS[intensity] || PRESETS.medium;

  const layer = document.createElement('div');
  layer.className = 'webgl-background-layer cute-girly-bg';
  layer.setAttribute('aria-hidden', 'true');
  document.body.prepend(layer);

  if (!detectWebGLSupport()) {
    layer.classList.add('is-fallback');
    document.body.classList.add('webgl-fallback');
    return {
      destroy: () => {
        layer.remove();
        document.body.classList.remove('webgl-fallback');
      }
    };
  }

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(getDevicePixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'webgl-background-canvas';
  layer.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.6, 9.5);

  const clock = new THREE.Clock();

  // Soft dreamy lighting
  const ambient = new THREE.AmbientLight(0xffe6f0, 0.85 * preset.bloomStrength);
  const keyLight = new THREE.DirectionalLight(0xffb3d9, 1.1 * preset.bloomStrength);
  keyLight.position.set(3, 4, 6);
  const fillLight = new THREE.DirectionalLight(0xc8b4ff, 0.8 * preset.bloomStrength);
  fillLight.position.set(-4, -2, 5);

  scene.add(ambient, keyLight, fillLight);

  const root = new THREE.Group();
  scene.add(root);

  // Airy color haze behind foreground objects.
  const hazeA = new THREE.Mesh(
    new THREE.SphereGeometry(7.2, 28, 28),
    new THREE.MeshBasicMaterial({
      color: 0xffd5ef,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  hazeA.position.set(-2.4, 1.2, -5.8);

  const hazeB = new THREE.Mesh(
    new THREE.SphereGeometry(6.2, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0xc8b4ff,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  hazeB.position.set(2.6, -1.8, -5.2);

  scene.add(hazeA, hazeB);

  // === Cute Pastel Rings / Hoops ===
  const ringMatA = new THREE.MeshStandardMaterial({
    color: 0xff9ed9,
    transparent: true,
    opacity: preset.ringOpacity,
    roughness: 0.25,
    metalness: 0.65,
    emissive: 0xff6ec7,
    emissiveIntensity: 0.15
  });

  const ringMatB = new THREE.MeshStandardMaterial({
    color: 0xb8a3ff,
    transparent: true,
    opacity: preset.ringOpacity - 0.1,
    roughness: 0.2,
    metalness: 0.7,
    emissive: 0x9b7cff,
    emissiveIntensity: 0.12
  });

  const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.09, 28, 160), ringMatA);
  ringA.rotation.x = Math.PI * 0.62;
  ringA.position.set(2.1, 1.4, -0.8);

  const ringB = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.07, 24, 160), ringMatB);
  ringB.rotation.x = Math.PI * 0.48;
  ringB.rotation.y = Math.PI * -0.25;
  ringB.position.set(-2.5, -1.6, -1.4);

  root.add(ringA, ringB);

  // === Cute Floating Bags (simplified low-poly box + handle look) ===
  const bagGeometry = new THREE.BoxGeometry(1.1, 0.9, 0.6);
  const bagMaterial = new THREE.MeshStandardMaterial({
    color: 0xffb3d1,
    roughness: 0.4,
    metalness: 0.1,
    emissive: 0xff80b3,
    emissiveIntensity: 0.2
  });

  const bag1 = new THREE.Mesh(bagGeometry, bagMaterial);
  bag1.position.set(-1.8, 1.2, 0.4);
  bag1.rotation.set(0.3, 0.6, 0.2);

  const bag2 = new THREE.Mesh(bagGeometry.clone(), bagMaterial.clone());
  bag2.material.color.setHex(0xa8d1ff);
  bag2.position.set(1.9, -1.3, 0.7);
  bag2.scale.set(0.75, 0.75, 0.75);
  bag2.rotation.set(-0.4, -0.5, 0.3);

  root.add(bag1, bag2);

  // === Sparkly Particles (hearts + stars feel) ===
  const sparkles = new THREE.Points(
    createSparkles(220),
    new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: preset.sparkleOpacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  scene.add(sparkles);

  const hearts = createHearts(20);
  scene.add(hearts);

  // Gentle floating crystals/gems
  const gemGeo = new THREE.IcosahedronGeometry(0.38, 1);
  const gemMat = new THREE.MeshStandardMaterial({
    color: 0xffd1e6,
    emissive: 0xff6ec7,
    emissiveIntensity: 0.55,
    roughness: 0.15,
    metalness: 0.3,
    transparent: true,
    opacity: 0.9
  });

  const gemA = new THREE.Mesh(gemGeo, gemMat.clone());
  gemA.position.set(0.3, 2.1, -0.5);
  gemA.scale.set(0.7, 0.7, 0.7);

  const gemB = new THREE.Mesh(gemGeo, gemMat.clone());
  gemB.position.set(-1.1, -1.4, 1.1);
  gemB.scale.set(0.55, 0.55, 0.55);

  root.add(gemA, gemB);

  let animationFrame = 0;
  let stopped = false;

  const renderStatic = () => {
    ringA.rotation.z = Math.PI * 0.18;
    ringB.rotation.z = -Math.PI * 0.22;
    sparkles.rotation.y = 0.08;
    renderer.render(scene, camera);
  };

  const tick = () => {
    if (stopped) return;

    const t = clock.getElapsedTime();
    const s = preset.speed * 0.75; // softer motion

    // Slow dreamy rotations
    ringA.rotation.z = t * 0.11 * s;
    ringA.rotation.y = t * 0.06 * s;
    ringB.rotation.z = -t * 0.09 * s;
    ringB.rotation.y = t * 0.05 * s;

    // Gentle bag float
    bag1.position.y = 1.2 + Math.sin(t * 0.6) * 0.18;
    bag1.rotation.z = Math.sin(t * 0.4) * 0.12;

    bag2.position.y = -1.3 + Math.cos(t * 0.55) * 0.15;
    bag2.rotation.z = Math.cos(t * 0.45) * 0.1;

    // Gem spin
    gemA.rotation.x = t * 0.45 * s;
    gemA.rotation.y = t * 0.32 * s;
    gemB.rotation.y = -t * 0.38 * s;
    gemB.rotation.z = t * 0.28 * s;

    root.position.y = Math.sin(t * 0.35) * 0.08;

    // Sparkles gentle movement
    sparkles.rotation.y = t * 0.015;
    sparkles.rotation.x = Math.sin(t * 0.08) * 0.03;
    sparkles.material.opacity = preset.sparkleOpacity + Math.sin(t * 1.35) * 0.08;

    // Floating hearts drift slowly upward and sway side-to-side.
    hearts.children.forEach((heart) => {
      const seed = heart.userData.floatSeed;
      const speed = heart.userData.floatSpeed;
      const amp = heart.userData.floatAmp;

      heart.rotation.z = Math.sin(t * speed + seed) * 0.35;
      heart.rotation.y = Math.cos(t * speed * 0.8 + seed) * 0.22;
      heart.position.y += Math.sin(t * speed + seed) * amp * 0.02;
      heart.position.x += Math.cos(t * speed * 0.7 + seed) * amp * 0.01;

      if (heart.position.y > 4.2) {
        heart.position.y = -4.1;
      }
    });

    // Very soft camera drift (dreamy)
    camera.position.x = Math.sin(t * 0.14) * preset.cameraDrift;
    camera.position.y = 0.6 + Math.cos(t * 0.11) * (preset.cameraDrift * 0.5);
    camera.lookAt(0, 0.2, 0);

    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(tick);
  };

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(getDevicePixelRatio());
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (reducedMotionQuery.matches) renderStatic();
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      window.cancelAnimationFrame(animationFrame);
    } else if (!reducedMotionQuery.matches) {
      animationFrame = window.requestAnimationFrame(tick);
    } else {
      renderStatic();
    }
  };

  const onReducedMotionChange = (e) => {
    window.cancelAnimationFrame(animationFrame);
    if (e.matches) {
      renderStatic();
    } else {
      clock.start();
      animationFrame = window.requestAnimationFrame(tick);
    }
  };

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  reducedMotionQuery.addEventListener('change', onReducedMotionChange);

  if (reducedMotionQuery.matches) {
    renderStatic();
  } else {
    animationFrame = window.requestAnimationFrame(tick);
  }

  return {
    destroy: () => {
      stopped = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      reducedMotionQuery.removeEventListener('change', onReducedMotionChange);

      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });

      renderer.dispose();
      layer.remove();
      document.body.classList.remove('webgl-fallback');
    }
  };
}

// Backward-compatible export used by src/main.js.
export function initBackground3D(options = {}) {
  return initCuteGirlyBackground(options);
}