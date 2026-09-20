import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';

export function createDinoScene(container, onDelivered) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1), 0.1, 100);
  camera.position.set(0, 2.8, 12.5);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.35 : 1.7));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const ambient = new THREE.HemisphereLight(0xfff2fd, 0x6f7759, 2.35);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 2.9);
  sun.position.set(6, 8, 8);
  sun.castShadow = true;
  scene.add(sun);
  const rim = new THREE.PointLight(0xff8eca, 18, 18);
  rim.position.set(-4, 3, 2);
  scene.add(rim);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(10, 64),
    new THREE.MeshStandardMaterial({ color: 0xa0d38a, roughness: 0.95, metalness: 0.02 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.25;
  ground.receiveShadow = true;
  scene.add(ground);

  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(2.1, 48),
    new THREE.MeshStandardMaterial({ color: 0x98e8ff, roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.78 })
  );
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(2.9, -1.22, 0.4);
  scene.add(pond);

  function makePalm(x, z, scale = 1, tilt = 0) {
    const palm = new THREE.Group();
    palm.position.set(x, -1.22, z);
    palm.scale.setScalar(scale);
    palm.rotation.z = tilt;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.22, 2.8, 9),
      new THREE.MeshStandardMaterial({ color: 0xa56d43, roughness: 0.9 })
    );
    trunk.position.y = 1.35;
    trunk.rotation.z = tilt * 0.35;
    trunk.castShadow = true;
    palm.add(trunk);

    const leafMat = new THREE.MeshStandardMaterial({ color: 0x5acb81, roughness: 0.85 });
    const leafGeom = new THREE.CapsuleGeometry(0.12, 1.15, 6, 10);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(leafGeom, leafMat);
      leaf.position.set(0, 2.65, 0);
      leaf.rotation.z = Math.cos(i / 6 * Math.PI * 2) * 0.28;
      leaf.rotation.y = (i / 6) * Math.PI * 2;
      leaf.rotation.x = -1.05 + Math.sin(i) * 0.15;
      leaf.position.x = Math.cos((i / 6) * Math.PI * 2) * 0.38;
      leaf.position.z = Math.sin((i / 6) * Math.PI * 2) * 0.38;
      leaf.castShadow = true;
      palm.add(leaf);
    }

    const heartLeft = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xff8cbf, roughness: 0.5 })
    );
    const heartRight = heartLeft.clone();
    const heartBase = new THREE.Mesh(
      new THREE.ConeGeometry(0.31, 0.55, 18),
      new THREE.MeshStandardMaterial({ color: 0xff8cbf, roughness: 0.5 })
    );
    heartLeft.position.set(-0.2, 2.2, 0.12);
    heartRight.position.set(0.2, 2.2, 0.12);
    heartBase.position.set(0, 1.88, 0.12);
    heartBase.rotation.z = Math.PI;
    palm.add(heartLeft, heartRight, heartBase);

    scene.add(palm);
    return palm;
  }

  const palms = [
    makePalm(-5.5, -2.6, 1.05, -0.08),
    makePalm(-3.9, 2.6, 0.92, 0.04),
    makePalm(5.4, -2.2, 1.1, 0.08),
    makePalm(4.3, 2.7, 0.96, -0.05)
  ];

  function makeBush(x, z, color = 0x6fcb7f) {
    const bush = new THREE.Group();
    bush.position.set(x, -1.08, z);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    [-0.35, 0, 0.35].forEach((offset, index) => {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.55 - index * 0.05, 18, 14), mat);
      sphere.position.set(offset, 0.25 + Math.max(0, 0.1 - Math.abs(offset) * 0.12), 0);
      bush.add(sphere);
    });
    scene.add(bush);
    return bush;
  }

  const bushes = [
    makeBush(-5.8, 1.9, 0x68c47b),
    makeBush(-6.4, -1.3, 0x5eb56d),
    makeBush(6.5, 1.7, 0x6dca81),
    makeBush(6.3, -1.5, 0x77d691)
  ];

  const envelopeGroup = new THREE.Group();
  const envelopeBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.75, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xfff7fc, roughness: 0.72 })
  );
  const seal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.05, 18),
    new THREE.MeshStandardMaterial({ color: 0xff77b6, roughness: 0.42 })
  );
  seal.rotation.x = Math.PI / 2;
  seal.position.z = 0.06;
  envelopeGroup.add(envelopeBase, seal);

  const dino = new THREE.Group();
  dino.position.set(-9.5, -0.18, 0);
  scene.add(dino);

  const skin = new THREE.MeshStandardMaterial({ color: 0x8f8cff, roughness: 0.62, metalness: 0.03 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xe4d0ff, roughness: 0.78 });
  const hornMat = new THREE.MeshStandardMaterial({ color: 0xffeff8, roughness: 0.65 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1d1e2f });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 20), skin);
  body.scale.set(1.35, 0.95, 0.92);
  body.castShadow = true;
  dino.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.95, 20, 16), accent);
  belly.scale.set(0.9, 0.78, 0.62);
  belly.position.set(0.42, -0.1, 0.45);
  dino.add(belly);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.95, 22, 18), skin);
  head.position.set(1.62, 0.78, 0.08);
  head.scale.set(1.02, 0.88, 0.95);
  head.castShadow = true;
  dino.add(head);

  const frill = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 1.05, 0.24, 30, 1, false, Math.PI * 0.08, Math.PI * 0.84), accent);
  frill.rotation.z = Math.PI / 2;
  frill.rotation.y = Math.PI / 2;
  frill.position.set(1.15, 0.92, 0.02);
  dino.add(frill);

  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.58, 18, 16), accent);
  snout.position.set(2.17, 0.58, 0.05);
  snout.scale.set(1.1, 0.78, 0.9);
  dino.add(snout);

  const noseHorn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 12), hornMat);
  noseHorn.position.set(2.45, 0.82, 0.04);
  noseHorn.rotation.z = -Math.PI / 2;
  dino.add(noseHorn);

  const browHornLeft = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.65, 12), hornMat);
  browHornLeft.position.set(1.95, 1.08, 0.26);
  browHornLeft.rotation.z = -Math.PI / 2;
  browHornLeft.rotation.y = 0.1;
  const browHornRight = browHornLeft.clone();
  browHornRight.position.z = -0.16;
  dino.add(browHornLeft, browHornRight);

  const eyeLeft = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), eyeMat);
  eyeLeft.position.set(2.0, 0.92, 0.28);
  const eyeRight = eyeLeft.clone();
  eyeRight.position.z = -0.18;
  dino.add(eyeLeft, eyeRight);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 2.1, 18), skin);
  tail.position.set(-2.0, 0.05, 0);
  tail.rotation.z = -Math.PI / 2;
  tail.castShadow = true;
  dino.add(tail);

  const legs = [];
  const legPositions = [
    [0.78, -1.08, 0.48],
    [-0.2, -1.08, 0.48],
    [0.78, -1.08, -0.48],
    [-0.2, -1.08, -0.48]
  ];
  for (const [x, y, z] of legPositions) {
    const legGroup = new THREE.Group();
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 6, 10), skin);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 12), accent);
    thigh.position.y = 0.18;
    foot.scale.set(1.45, 0.55, 0.9);
    foot.position.set(0.17, -0.33, 0);
    legGroup.add(thigh, foot);
    legGroup.position.set(x, y, z);
    dino.add(legGroup);
    legs.push(legGroup);
  }

  for (let i = 0; i < 7; i++) {
    const spot = new THREE.Mesh(
      new THREE.SphereGeometry(0.12 + (i % 2) * 0.04, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xff8fc8, roughness: 0.7 })
    );
    spot.scale.z = 0.45;
    spot.position.set(-0.7 + i * 0.34, 0.55 + Math.sin(i * 0.8) * 0.15, -0.84);
    dino.add(spot);
  }

  const armLeft = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.28, 6, 8), skin);
  const armRight = armLeft.clone();
  armLeft.position.set(1.2, -0.08, 0.62);
  armRight.position.set(1.2, -0.08, -0.62);
  armLeft.rotation.z = -0.45;
  armRight.rotation.z = -0.45;
  dino.add(armLeft, armRight);

  envelopeGroup.position.set(1.3, 0.08, 0.95);
  dino.add(envelopeGroup);

  const particles = [];
  for (let i = 0; i < (isMobile ? 16 : 26); i++) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.035 + Math.random() * 0.03, 10, 8),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff94c8 : 0xc8a4ff, transparent: true, opacity: 0.62 })
    );
    particle.position.set((Math.random() - 0.5) * 13, Math.random() * 5 + 0.2, (Math.random() - 0.5) * 4);
    scene.add(particle);
    particles.push(particle);
  }

  let rafId = 0;
  let delivered = false;
  const start = performance.now();

  function animationFrame(time) {
    const t = (time - start) / 1000;
    const enterDuration = prefersReduced ? 1.8 : 4.0;
    const exitDuration = prefersReduced ? 1.2 : 2.1;
    const dropTime = enterDuration * 0.82;

    let x;
    if (t < enterDuration) {
      const p = t / enterDuration;
      const ease = 1 - Math.pow(1 - p, 3);
      x = -9.5 + 11.3 * ease;
    } else {
      const exitP = Math.min((t - enterDuration) / exitDuration, 1);
      x = 1.8 + 10.5 * exitP;
      if (!delivered) {
        delivered = true;
        onDelivered?.();
      }
    }

    dino.position.x = x;
    dino.position.y = -0.18 + Math.abs(Math.sin(t * 7.3)) * 0.14 * (t < enterDuration ? 1 : 0.5);
    dino.rotation.y = 0.12 + Math.sin(t * 2.2) * 0.03;
    dino.rotation.z = Math.sin(t * 7.2) * 0.02;

    legs[0].rotation.z = Math.sin(t * 7.3) * 0.45;
    legs[1].rotation.z = -Math.sin(t * 7.3) * 0.45;
    legs[2].rotation.z = -Math.sin(t * 7.3) * 0.45;
    legs[3].rotation.z = Math.sin(t * 7.3) * 0.45;

    tail.rotation.x = Math.sin(t * 3.8) * 0.12;
    armLeft.rotation.x = Math.sin(t * 5.2) * 0.14;
    armRight.rotation.x = -Math.sin(t * 5.2) * 0.14;

    palms.forEach((palm, index) => {
      palm.rotation.z = Math.sin(t * 0.9 + index) * 0.02;
    });
    bushes.forEach((bush, index) => {
      bush.position.y = -1.08 + Math.sin(t * 1.8 + index) * 0.02;
    });

    envelopeGroup.rotation.z = Math.sin(t * 8) * 0.08;
    if (t > dropTime && t < enterDuration) {
      const dropP = (t - dropTime) / (enterDuration - dropTime);
      envelopeGroup.position.y = 0.08 - dropP * 0.56;
      envelopeGroup.rotation.z = 0.1 + dropP * 0.2;
    } else if (t >= enterDuration) {
      envelopeGroup.position.y = -0.48;
      envelopeGroup.rotation.z = 0.3;
    }

    particles.forEach((particle, index) => {
      particle.position.y += 0.005 + (index % 3) * 0.0008;
      particle.position.x += Math.sin(t + index) * 0.0006;
      if (particle.position.y > 6.2) particle.position.y = -0.4;
      particle.scale.setScalar(0.9 + Math.sin(t * 2 + index) * 0.14);
    });

    renderer.render(scene, camera);
    if (dino.position.x < 12.4) rafId = requestAnimationFrame(animationFrame);
  }

  rafId = requestAnimationFrame(animationFrame);

  const resize = () => {
    camera.aspect = Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener('resize', resize);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    renderer.dispose();
    container.replaceChildren();
  };
}
