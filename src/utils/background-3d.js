import * as THREE from 'three';

const PRESETS = {
  subtle: {
    speed: 0.25,
    ringOpacity: 0.26,
    particleOpacity: 0.18,
    cameraDrift: 0.09,
    bloomStrength: 0.75
  },
  medium: {
    speed: 0.42,
    ringOpacity: 0.36,
    particleOpacity: 0.26,
    cameraDrift: 0.15,
    bloomStrength: 1
  },
  bold: {
    speed: 0.62,
    ringOpacity: 0.5,
    particleOpacity: 0.34,
    cameraDrift: 0.2,
    bloomStrength: 1.2
  }
};

function detectWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return Boolean(context);
  } catch (_error) {
    return false;
  }
}

function getDevicePixelRatio() {
  const ratio = window.devicePixelRatio || 1;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  return Math.min(ratio, isMobile ? 1.5 : 2);
}

function createStarfield(count = 150) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const stride = index * 3;
    positions[stride] = (Math.random() - 0.5) * 16;
    positions[stride + 1] = (Math.random() - 0.5) * 12;
    positions[stride + 2] = (Math.random() - 0.5) * 10;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geometry;
}

export function initBackground3D({ intensity = 'medium' } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { destroy: () => {} };
  }

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const preset = PRESETS[intensity] || PRESETS.medium;
  const layer = document.createElement('div');
  layer.className = 'webgl-background-layer';
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
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 8.5);

  const clock = new THREE.Clock();

  const ambient = new THREE.AmbientLight(0xfff6fb, 0.7 * preset.bloomStrength);
  const key = new THREE.DirectionalLight(0x70d1e8, 0.9 * preset.bloomStrength);
  key.position.set(2, 3, 5);
  const fill = new THREE.DirectionalLight(0xff69b4, 0.7 * preset.bloomStrength);
  fill.position.set(-3, -2, 4);

  scene.add(ambient);
  scene.add(key);
  scene.add(fill);

  const root = new THREE.Group();
  scene.add(root);

  const torusMaterialA = new THREE.MeshStandardMaterial({
    color: 0xff80c4,
    transparent: true,
    opacity: preset.ringOpacity,
    roughness: 0.3,
    metalness: 0.55
  });
  const torusMaterialB = new THREE.MeshStandardMaterial({
    color: 0x70d1e8,
    transparent: true,
    opacity: preset.ringOpacity - 0.08,
    roughness: 0.25,
    metalness: 0.5
  });

  const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.08, 24, 180), torusMaterialA);
  ringA.rotation.x = Math.PI * 0.55;
  ringA.position.set(2.4, 1.6, -0.6);

  const ringB = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.06, 20, 180), torusMaterialB);
  ringB.rotation.x = Math.PI * 0.45;
  ringB.rotation.y = Math.PI * 0.2;
  ringB.position.set(-2.2, -1.7, -1.2);

  root.add(ringA);
  root.add(ringB);

  const crystalGeometry = new THREE.IcosahedronGeometry(0.42, 0);
  const crystalMaterial = new THREE.MeshStandardMaterial({
    color: 0x9b7cc3,
    emissive: 0x2a1634,
    emissiveIntensity: 0.4,
    roughness: 0.35,
    metalness: 0.2,
    transparent: true,
    opacity: 0.85
  });

  const crystalA = new THREE.Mesh(crystalGeometry, crystalMaterial.clone());
  crystalA.position.set(-1.3, 1.05, 0.6);

  const crystalB = new THREE.Mesh(crystalGeometry, crystalMaterial.clone());
  crystalB.position.set(1.45, -1.2, 0.8);
  crystalB.scale.set(0.8, 0.8, 0.8);

  const crystalC = new THREE.Mesh(crystalGeometry, crystalMaterial.clone());
  crystalC.position.set(0.1, 1.9, -0.3);
  crystalC.scale.set(0.65, 0.65, 0.65);

  root.add(crystalA);
  root.add(crystalB);
  root.add(crystalC);

  const points = new THREE.Points(
    createStarfield(180),
    new THREE.PointsMaterial({
      color: 0xfff0f7,
      size: 0.045,
      transparent: true,
      opacity: preset.particleOpacity,
      depthWrite: false
    })
  );
  scene.add(points);

  let animationFrame = 0;
  let stopped = false;

  const renderStatic = () => {
    ringA.rotation.z = Math.PI * 0.22;
    ringB.rotation.z = -Math.PI * 0.17;
    points.rotation.y = 0.1;
    renderer.render(scene, camera);
  };

  const tick = () => {
    if (stopped) {
      return;
    }

    const elapsed = clock.getElapsedTime();
    const motion = preset.speed;

    ringA.rotation.z = elapsed * 0.16 * motion;
    ringA.rotation.y = elapsed * 0.09 * motion;
    ringB.rotation.z = -elapsed * 0.12 * motion;
    ringB.rotation.y = elapsed * 0.07 * motion;

    crystalA.rotation.x = elapsed * 0.55 * motion;
    crystalA.rotation.y = elapsed * 0.4 * motion;
    crystalB.rotation.y = -elapsed * 0.45 * motion;
    crystalB.rotation.z = elapsed * 0.36 * motion;
    crystalC.rotation.x = elapsed * 0.62 * motion;
    crystalC.rotation.z = -elapsed * 0.38 * motion;

    root.position.y = Math.sin(elapsed * 0.45) * 0.12;
    points.rotation.y = elapsed * 0.02;
    points.rotation.x = Math.sin(elapsed * 0.1) * 0.04;

    camera.position.x = Math.sin(elapsed * 0.18) * preset.cameraDrift;
    camera.position.y = Math.cos(elapsed * 0.13) * (preset.cameraDrift * 0.6);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(tick);
  };

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(getDevicePixelRatio());
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (reducedMotionQuery.matches) {
      renderStatic();
    }
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

  const onReducedMotionChange = event => {
    window.cancelAnimationFrame(animationFrame);
    if (event.matches) {
      renderStatic();
      return;
    }
    clock.start();
    animationFrame = window.requestAnimationFrame(tick);
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

      scene.traverse(object => {
        if (!object.isMesh && !object.isPoints) {
          return;
        }
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else if (object.material) {
          object.material.dispose();
        }
      });

      renderer.dispose();
      layer.remove();
      document.body.classList.remove('webgl-fallback');
    }
  };
}
