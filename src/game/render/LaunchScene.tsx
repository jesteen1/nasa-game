"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import type { BuildConfig, SimSnapshot, Vehicle, VehicleStats } from "../types";
import { computeStats } from "../sim/vehicle";
import type { SimEngine } from "../sim/engine";
import { glowTexture, partTexture } from "./sprites";

interface Props {
  engineRef: MutableRefObject<SimEngine | null>;
  vehicle: Vehicle;
  build: BuildConfig;
}

const VIEW_HEIGHT = 175;

export default function LaunchScene({ engineRef, vehicle, build }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const stats: VehicleStats = computeStats(vehicle, build);
    const focusOffset = Math.max(55, stats.heightM / 2 + 8);
    let width = Math.max(1, container.clientWidth);
    let height = Math.max(1, container.clientHeight);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#122a47");

    const makeCamera = () => {
      const aspect = width / height;
      const cam = new THREE.OrthographicCamera(
        (-VIEW_HEIGHT * aspect) / 2,
        (VIEW_HEIGHT * aspect) / 2,
        VIEW_HEIGHT / 2,
        -VIEW_HEIGHT / 2,
        0.1,
        6000,
      );
      cam.position.set(0, focusOffset, 100);
      cam.lookAt(0, focusOffset, 0);
      return cam;
    };
    let camera = makeCamera();

    const rocket = new THREE.Group();
    scene.add(rocket);

    const stage1Ids = new Set([
      build.s1Engine,
      build.s1Tank,
      build.boosters,
      build.fins,
      build.interstage,
    ]);
    const stage1Meshes: THREE.Mesh[] = [];
    const fairingMeshes: THREE.Mesh[] = [];

    for (const item of stats.layout) {
      const texture = partTexture(item.part);
      if (!texture) continue;
      const geo = new THREE.PlaneGeometry(item.part.widthM, item.part.heightM);
      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.02,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(item.x, item.y, item.z);
      rocket.add(mesh);
      if (stage1Ids.has(item.part.id)) stage1Meshes.push(mesh);
      if (item.part.id === build.fairing) fairingMeshes.push(mesh);
    }

    // Engine plume -----------------------------------------------------------
    const plume = new THREE.Group();
    const plumeSprites: THREE.Sprite[] = [];
    const plumeBase = new THREE.Vector3(0, -2, 0.6);
    const plumeSpecs = [
      { color: "#fff3c4", scale: 0.55 },
      { color: "#ffb300", scale: 0.95 },
      { color: "#ff5c33", scale: 1.35 },
    ];
    for (const spec of plumeSpecs) {
      const material = new THREE.SpriteMaterial({
        map: glowTexture(spec.color, spec.color),
        color: new THREE.Color(spec.color),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0.9,
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(8, 18, 1);
      plumeSprites.push(sprite);
      plume.add(sprite);
    }
    plume.position.copy(plumeBase);
    rocket.add(plume);

    const stage2Base =
      (() => {
        const engine = stats.layout.find((item) => item.part.id === build.s2Engine);
        if (!engine) return 0;
        return engine.y - engine.part.heightM / 2;
      })() || 0;

    // Explosion --------------------------------------------------------------
    const explosion = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture("#fff6d5", "#ff6a00"),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      }),
    );
    explosion.scale.set(10, 10, 1);
    explosion.position.set(0, 6, 1);
    scene.add(explosion);

    // Stars ------------------------------------------------------------------
    const starGeo = new THREE.BufferGeometry();
    const starCount = 500;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 900;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 900;
      positions[i * 3 + 2] = -200 - Math.random() * 400;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: "#dfe9ff",
      size: 1.6,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    stars.position.y = focusOffset;
    scene.add(stars);

    // Pad -------------------------------------------------------------------
    const pad = new THREE.Group();
    const concrete = new THREE.MeshBasicMaterial({ color: "#28374f" });
    const steel = new THREE.MeshBasicMaterial({ color: "#3e5470" });
    const accent = new THREE.MeshBasicMaterial({ color: "#00e5ff" });

    const base = new THREE.Mesh(new THREE.PlaneGeometry(220, 4), concrete);
    base.position.set(0, -2, -1);
    pad.add(base);

    const deck = new THREE.Mesh(new THREE.PlaneGeometry(44, 3), steel);
    deck.position.set(0, -0.2, -0.5);
    pad.add(deck);

    const tower = new THREE.Mesh(new THREE.PlaneGeometry(4, 58), steel);
    tower.position.set(-15, 29, -1);
    pad.add(tower);

    for (let i = 0; i < 5; i++) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(12, 0.7), steel);
      bar.position.set(-9, 8 + i * 10, -1);
      pad.add(bar);
    }

    const beacon = new THREE.Mesh(new THREE.CircleGeometry(1.4, 16), accent);
    beacon.position.set(-15, 58.5, -1);
    pad.add(beacon);
    scene.add(pad);

    // Animation --------------------------------------------------------------
    let raf = 0;
    let explosionStart = -1;
    let lastFailure: string | null = null;
    let rocketHidden = false;

    const smoothstep = (edge0: number, edge1: number, x: number) => {
      const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    };

    const skyLow = new THREE.Color("#1c4a78");
    const skyMid = new THREE.Color("#0b1021");
    const skyHigh = new THREE.Color("#02030a");

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const snap: SimSnapshot | null = engineRef.current?.getSnapshot() ?? null;
      const altitude = snap?.h ?? 0;

      const targetY = altitude + focusOffset;
      camera.position.y = targetY;
      camera.lookAt(0, targetY, 0);
      rocket.position.y = altitude;

      // Sky gradient by altitude
      const altKm = altitude / 1000;
      const color = skyLow.clone();
      if (altKm < 18) color.lerp(skyMid, smoothstep(0, 18, altKm));
      else color.lerp(skyHigh, smoothstep(18, 90, altKm));
      (scene.background as THREE.Color).copy(color);

      starMat.opacity = smoothstep(25, 90, altKm);
      stars.position.y = targetY;
      pad.visible = altitude < 4000;

      // Stage / fairing state
      if (snap?.separated) {
        for (const mesh of stage1Meshes) mesh.visible = false;
      }
      if (snap && !snap.fairingAttached) {
        for (const mesh of fairingMeshes) mesh.visible = false;
      }

      // Plume
      const stage1Active =
        !!snap &&
        snap.status === "flying" &&
        snap.stage === 1 &&
        !snap.stage1Burnout &&
        snap.propellant1Kg > 0;
      const stage2Active =
        !!snap &&
        snap.status === "flying" &&
        snap.stage === 2 &&
        snap.stage2Ignited &&
        !snap.seco &&
        snap.propellant2Kg > 0;
      const active = stage1Active || stage2Active;
      plume.visible = active;
      if (snap) {
        const throttle = snap.throttle;
        const vacuum = 1 + Math.min(1.4, altitude / 60000);
        plume.position.y = snap.stage === 2 ? stage2Base - 2 : -2;
        plumeSprites.forEach((sprite, i) => {
          const flicker = 0.9 + Math.sin(performance.now() * 0.02 + i * 1.7) * 0.12;
          sprite.scale.set(
            (6 + i * 4) * throttle * vacuum * flicker,
            (16 + i * 7) * throttle * vacuum * flicker,
            1,
          );
          sprite.position.y = -i * 4;
        });
      }

      // Explosion on failure
      if (snap?.failure && snap.failure.id !== lastFailure) {
        lastFailure = snap.failure.id;
        const noExplosion = ["timeout", "unstable_orbit", "cryo_boiloff"].includes(
          snap.failure.id,
        );
        if (!noExplosion) {
          explosionStart = performance.now();
          explosion.visible = true;
          explosion.position.y = snap.failure.id === "pad_burn" ? 8 : 12;
        }
        rocketHidden = !noExplosion;
      }

      if (explosionStart > 0) {
        const elapsed = (performance.now() - explosionStart) / 1000;
        const size = 18 + elapsed * 120;
        explosion.scale.set(size, size, 1);
        const material = explosion.material as THREE.SpriteMaterial;
        material.opacity = Math.max(0, 1 - elapsed / 2.2);
        if (elapsed > 2.2) {
          explosion.visible = false;
          explosionStart = -1;
        }
      }
      if (snap) {
        rocket.visible = !(rocketHidden && snap.failure && snap.status === "failure");
      } else {
        rocket.visible = true;
      }

      // Camera shake during ignition and explosions
      let shake = 0;
      if (snap?.status === "flying" && snap.t < 5) {
        shake = Math.max(0, (5 - snap.t) / 5) * 1.8;
      }
      if (snap?.status === "failure" && explosionStart > 0) {
        shake = Math.max(
          shake,
          Math.max(0, 1 - (performance.now() - explosionStart) / 1200) * 3.2,
        );
      }
      camera.position.x = (Math.random() - 0.5) * shake;
      camera.position.y = targetY + (Math.random() - 0.5) * shake * 0.6;
      camera.lookAt(0, targetY, 0);

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height);
      const aspect = width / height;
      camera = makeCamera();
      camera.left = (-VIEW_HEIGHT * aspect) / 2;
      camera.right = (VIEW_HEIGHT * aspect) / 2;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material as THREE.Material | THREE.Material[];
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material.dispose();
        }
      });
    };
  }, [vehicle, build, engineRef]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#0b1021]"
      aria-label="Launch vehicle viewport"
    />
  );
}
