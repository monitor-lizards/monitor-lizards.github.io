import * as THREE from 'three'
import React, { Suspense, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  EffectComposer,
  ChromaticAberration,
  DepthOfField,
  Bloom,
  Noise,
  Glitch,
  Sepia,
  Vignette,
} from '@react-three/postprocessing'

import { BlendFunction } from 'postprocessing'

import { Html, Icosahedron, useTexture, useCubeTexture, MeshDistortMaterial } from '@react-three/drei'

import './style.css'

function MainSphere({ material }) {
  const main = useRef()
  // main sphere rotates following the mouse position
  useFrame(({ clock, mouse }) => {
    main.current.rotation.z = clock.getElapsedTime()
    main.current.rotation.y = THREE.MathUtils.lerp(main.current.rotation.y, mouse.x * Math.PI, 0.1)
    main.current.rotation.x = THREE.MathUtils.lerp(main.current.rotation.x, mouse.y * Math.PI, 0.1)
  })
  return <Icosahedron args={[1, 16]} ref={main} material={material} position={[0, 0, 0]} />
}

function Instances({ material }) {
  // we use this array ref to store the spheres after creating them
  const [sphereRefs] = useState(() => [])
  // we use this array to initialize the background spheres
  const initialPositions = [
    [-4, 20, -12],
    [-10, 12, -4],
    // [-11, -12, -23], // far plane
    [-16, -6, -10],
    [12, -2, -3],
    [13, 4, -12],
    //[14, -2, -23],
    //[8, 10, -20]
  ]
  // smaller spheres movement
  useFrame(() => {
    // animate each sphere in the array
    sphereRefs.forEach((el) => {
      el.position.y += 0.02
      if (el.position.y > 19) el.position.y = -18
      // el.rotation.x += 0.03;
      // el.rotation.y += 0.03;
      // el.rotation.z += 0.01;
    })
  })
  return (
    <>
      <MainSphere material={material} />
      {initialPositions.map((pos, i) => (
        <Icosahedron
          args={[1, 8]}
          position={[pos[0], pos[1], pos[2]]}
          material={material}
          key={i}
          ref={(ref) => (sphereRefs[i] = ref)}
        />
      ))}
    </>
  )
}

function Scene() {
  const bumpMap = useTexture('/bump.jpg')
  // const envMap = useTexture('/bump.jpg');
  const envMap = useCubeTexture(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'], { path: '/cube/' })
  // We use `useResource` to be able to delay rendering the spheres until the material is ready
  const [material, set] = useState()

  // change main material here
  return (
    <>
      <MeshDistortMaterial
        ref={set}
        envMap={envMap}
        bumpMap={bumpMap}
        color={'#010101'}
        roughness={0.1}
        metalness={1}
        bumpScale={0.005}
        clearcoat={1}
        clearcoatRoughness={1}
        radius={1}
        distort={0.5}
        // speed={22.33}
        speed={2.33}
      />
      {material && <Instances material={material} />}
    </>
  )
}

export const Blob = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 3] }}
      gl={{
        powerPreference: 'high-performance',
        alpha: false,
        antialias: false,
        stencil: false,
        depth: false,
      }}>
      <Suspense fallback={<Html center>Hatching the Eggs...</Html>}>
        <Scene />
      </Suspense>

      <EffectComposer multisampling={0} disableNormalPass={true}>
        <DepthOfField focusDistance={0.0077} focalLength={0.02} bokehScale={8} height={480} />
        <Bloom intensity={1} luminanceThreshold={0.1} luminanceSmoothing={0.9} height={300} opacity={3} />
        <Sepia
          intensity={0.77} // sepia intensity
          blendFunction={BlendFunction.SUBTRACT} // blend mode
        />
        <Noise opacity={0.09} />
        <Vignette eskil={false} offset={0.1} darkness={1.07} />

        <Glitch
          delay={[13, 34]} // min and max glitch delay
          duration={[0.5, 0.8]} // min and max glitch duration
          strength={[0.2, 1.3]} // min and max glitch strength
          ratio={0.77} // Threshold for strong glitches, 0 - no weak glitches, 1 - no strong glitches.
          // blendFunction={}
          dtSize={128}
          columns={0.21}
          // perturbationMap={'./glitch-texture.png'}
        />

        <ChromaticAberration
          // blendFunction={BlendFunction.NORMAL} // blend mode
          // blendFunction={BlendFunction.SCREEN} // blend mode
          blendFunction={BlendFunction.SUBTRACT} // blend mode
          offset={[0.0021, 0.0034]} // color offset
        />
      </EffectComposer>

      <color attach="background" args={['#070707']} />

      <fog color="#131313" attach="fog" near={8} far={30} />
    </Canvas>
  )
  // 050505
  // 161616
}
