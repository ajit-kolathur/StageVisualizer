const COUNT = 2000;

export function setup(THREE, scene, camera) {
  camera.position.z = 50;

  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const velocities = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 80;
    positions[i3 + 1] = (Math.random() - 0.5) * 80;
    positions[i3 + 2] = (Math.random() - 0.5) * 80;
    velocities[i3] = (Math.random() - 0.5) * 0.2;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.2;
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.2;
    colors[i3] = Math.random();
    colors[i3 + 1] = Math.random() * 0.5;
    colors[i3 + 2] = 1.0;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({ size: 0.6, vertexColors: true, transparent: true, opacity: 0.85 });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  return { points, geo, velocities, positions, colors };
}

export function update(state, audioData, time) {
  const { positions, velocities, colors, geo, points } = state;
  const bass = audioData.bass;
  const treble = audioData.treble;
  const t = time * 0.001;

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    positions[i3] += velocities[i3] * (1 + bass * 4);
    positions[i3 + 1] += velocities[i3 + 1] * (1 + bass * 4);
    positions[i3 + 2] += velocities[i3 + 2] * (1 + treble * 3);

    for (let j = 0; j < 3; j++) {
      if (positions[i3 + j] > 40) positions[i3 + j] = -40;
      if (positions[i3 + j] < -40) positions[i3 + j] = 40;
    }

    colors[i3] = 0.5 + 0.5 * Math.sin(t + i * 0.01);
    colors[i3 + 1] = treble * 0.8;
    colors[i3 + 2] = 0.5 + bass * 0.5;
  }

  geo.attributes.position.needsUpdate = true;
  geo.attributes.color.needsUpdate = true;
  points.material.size = 0.4 + bass * 2;
  points.rotation.y = t * 0.1;
  points.rotation.x = Math.sin(t * 0.05) * 0.3;
}
