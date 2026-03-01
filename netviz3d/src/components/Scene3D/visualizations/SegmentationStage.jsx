import React, { useState, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import gsap from 'gsap'

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const SEGMENT_COLORS = [
  { main: '#22c55e', emissive: '#16a34a' },
  { main: '#f59e0b', emissive: '#d97706' },
  { main: '#a78bfa', emissive: '#7c3aed' },
  { main: '#22d3ee', emissive: '#0891b2' },
]

const SEGMENT_SPACING = 0.95
const DATA_BLOCK_Y = 0.8
const SERVER_POSITION = [4.5, DATA_BLOCK_Y, 0] // Server on the right side
const SEGMENT_POSITIONS = [
  [-SEGMENT_SPACING * 1.8, DATA_BLOCK_Y, 0],
  [-SEGMENT_SPACING * 0.6, DATA_BLOCK_Y, 0],
  [SEGMENT_SPACING * 0.6, DATA_BLOCK_Y, 0],
  [SEGMENT_SPACING * 1.8, DATA_BLOCK_Y, 0],
]

const ANIMATION_CONFIG = {
  laser: { duration: 2.5, ease: 'power2.inOut' },
  fadeOut: { duration: 1.0, delay: 2.5, ease: 'power2.in' },
  segmentsAppear: 3.5,  // After fade completes
  segmentSlide: { duration: 1.2, ease: 'power2.out' },
  segmentStagger: 0.12,
  headerDelay: 0.4,
  headerDuration: 0.6,
  // Phase 4: Transmission
  transmission: { 
    duration: 2.0, 
    stagger: 0.4, 
    ease: 'power2.inOut',
    arcHeight: 0.3, // Arc peak height for travel path
  },
  reassembly: { 
    duration: 1.2, 
    ease: 'back.out(1.7)',
    scaleDelay: 0.3,
  },
  successFlash: { duration: 0.8, ease: 'power2.inOut' },
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * DataBlock - Initial data cube (Phase 1)
 */
function DataBlock({ opacity }) {
  const meshRef = useRef()

  useFrame((state) => {
    if (!meshRef.current || opacity <= 0) return
    
    try {
      const t = state.clock.elapsedTime
      
      meshRef.current.rotation.y += 0.008
      meshRef.current.rotation.x = Math.sin(t * 0.35) * 0.15
      if (meshRef.current.material) {
        meshRef.current.material.emissiveIntensity = 0.4 + Math.sin(t * 2.5) * 0.25
      }
    } catch {
      // Silently fail if frame updates fail
    }
  })

  if (opacity <= 0) return null

  return (
    <group position={[0, DATA_BLOCK_Y, 0]}>
      {/* Main cube */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshPhongMaterial
          color="#a855f7"
          emissive="#9333ea"
          emissiveIntensity={0.5}
          shininess={160}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Enhanced glow effect */}
      <mesh>
        <boxGeometry args={[1.65, 1.65, 1.65]} />
        <meshBasicMaterial
          color="#a855f7"
          transparent
          opacity={0.08 * opacity}
          depthWrite={false}
        />
      </mesh>

      {/* Label */}
      {opacity > 0.2 && (
        <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.6), rgba(147,51,234,0.45))',
            backdropFilter: 'blur(16px)',
            border: '2px solid #a855f7',
            borderRadius: '8px',
            padding: '6px 14px',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: '900',
            fontFamily: 'monospace',
            letterSpacing: '1px',
            opacity: Math.min(opacity * 1.8, 1),
            boxShadow: '0 0 20px rgba(168,85,247,0.8), 0 4px 12px rgba(0,0,0,0.7)',
            whiteSpace: 'nowrap',
            textShadow: '0 0 12px rgba(255,255,255,0.8), 0 0 24px rgba(168,85,247,0.9)',
          }}>
            🔄 DATA · 5840B
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * ServerCube - Receiver/destination for segments (Phase 4+)
 */
function ServerCube({ visible, showReassembled, successFlash }) {
  const meshRef = useRef()
  const groupRef = useRef()
  const animationRef = useRef(null)
  const [flashOpacity, setFlashOpacity] = useState(0)
  const [cubeOpacity, setCubeOpacity] = useState(0)
  const [cubeScale, setCubeScale] = useState(0)

  // Fade in/out animation when visible changes
  useEffect(() => {
    // Kill any existing animation
    if (animationRef.current) {
      animationRef.current.kill()
    }

    if (visible) {
      animationRef.current = gsap.to({ opacity: cubeOpacity }, {
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
        onUpdate: function() {
          setCubeOpacity(this.targets()[0].opacity)
        },
      })
    } else {
      // Fade out smoothly when hidden
      animationRef.current = gsap.to({ opacity: cubeOpacity }, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onUpdate: function() {
          setCubeOpacity(this.targets()[0].opacity)
        },
      })
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.kill()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  // Reassembly animation - scale up with bounce
  useEffect(() => {
    if (showReassembled) {
      gsap.to({ scale: 0 }, {
        scale: 1,
        duration: ANIMATION_CONFIG.reassembly.duration,
        ease: ANIMATION_CONFIG.reassembly.ease,
        onUpdate: function() {
          setCubeScale(this.targets()[0].scale)
        },
      })
    } else {
      setCubeScale(0)
    }
  }, [showReassembled])

  useFrame((state) => {
    if (!meshRef.current) return
    
    try {
      const t = state.clock.elapsedTime
      
      // Gentle rotation
      meshRef.current.rotation.y += 0.005
      meshRef.current.rotation.x = Math.sin(t * 0.25) * 0.1
      
      if (showReassembled && meshRef.current.material) {
        meshRef.current.material.emissiveIntensity = 0.4 + Math.sin(t * 2.0) * 0.2
      }
    } catch {
      // Silently fail if frame updates fail
    }
  })

  // Success flash animation
  useEffect(() => {
    if (successFlash) {
      gsap.to({ opacity: 0 }, {
        opacity: 1,
        duration: ANIMATION_CONFIG.successFlash.duration / 2,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
        onUpdate: function() {
          setFlashOpacity(this.targets()[0].opacity)
        },
      })
    }
  }, [successFlash])

  if (cubeOpacity === 0) return null

  return (
    <group position={SERVER_POSITION}>
      {/* Server placeholder - waiting state (before reassembly) */}
      {!showReassembled && (
        <mesh>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshBasicMaterial
            color="#64748b"
            transparent
            opacity={0.15 * cubeOpacity}
            wireframe={true}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Server cube - appears when reassembled */}
      {showReassembled && cubeScale > 0 && (
        <group ref={groupRef} scale={cubeScale}>
          <mesh ref={meshRef} castShadow receiveShadow>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshPhongMaterial
              color="#a855f7"
              emissive="#9333ea"
              emissiveIntensity={0.5}
              shininess={160}
            />
          </mesh>

          {/* Glow effect */}
          <mesh>
            <boxGeometry args={[1.65, 1.65, 1.65]} />
            <meshBasicMaterial
              color="#a855f7"
              transparent
              opacity={0.08}
              depthWrite={false}
            />
          </mesh>

          {/* Success flash - green glow */}
          {flashOpacity > 0 && (
            <mesh>
              <boxGeometry args={[2.2, 2.2, 2.2]} />
              <meshBasicMaterial
                color="#22c55e"
                transparent
                opacity={flashOpacity * 0.5}
                depthWrite={false}
              />
            </mesh>
          )}
        </group>
      )}

      {/* Server label */}
      <Html position={[0, showReassembled ? 1.2 : 0.6, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          background: showReassembled 
            ? 'linear-gradient(135deg, rgba(34,197,94,0.8), rgba(22,163,74,0.55))'
            : 'linear-gradient(135deg, rgba(100,116,139,0.6), rgba(71,85,105,0.45))',
          backdropFilter: 'blur(16px)',
          border: showReassembled ? '2px solid #22c55e' : '2px solid #64748b',
          borderRadius: '8px',
          padding: '6px 14px',
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: '900',
          fontFamily: 'monospace',
          letterSpacing: '1px',
          opacity: cubeOpacity,
          boxShadow: showReassembled 
            ? '0 0 20px rgba(34,197,94,0.8), 0 4px 12px rgba(0,0,0,0.7)'
            : '0 0 12px rgba(100,116,139,0.5), 0 4px 8px rgba(0,0,0,0.6)',
          whiteSpace: 'nowrap',
          textShadow: showReassembled 
            ? '0 0 12px rgba(34,197,94,0.9)' 
            : '0 0 8px rgba(148,163,184,0.7)',
        }}>
          {showReassembled ? '✓ SERVER · COMPLETE' : '📥 SERVER'}
        </div>
      </Html>
    </group>
  )
}

/**
 * ConnectionLine - Visual path between source and server (Phase 4+)
 */
function ConnectionLine({ visible }) {
  const animationRef = useRef(null)
  const [lineOpacity, setLineOpacity] = useState(0)

  useEffect(() => {
    // Kill any existing animation
    if (animationRef.current) {
      animationRef.current.kill()
    }

    if (visible) {
      animationRef.current = gsap.to({ opacity: lineOpacity }, {
        opacity: 1,
        duration: 0.6,
        ease: 'power2.out',
        onUpdate: function() {
          setLineOpacity(this.targets()[0].opacity)
        },
      })
    } else {
      // Fade out smoothly when hidden
      animationRef.current = gsap.to({ opacity: lineOpacity }, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onUpdate: function() {
          setLineOpacity(this.targets()[0].opacity)
        },
      })
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.kill()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (lineOpacity === 0) return null

  const startPoint = [0, DATA_BLOCK_Y, 0]
  const endPoint = SERVER_POSITION

  return (
    <Line
      points={[startPoint, endPoint]}
      color="#38bdf8"
      lineWidth={2}
      dashed
      dashSize={0.15}
      gapSize={0.15}
      opacity={0.4 * lineOpacity}
      transparent
    />
  )
}

/**
 * LaserLine - Solid square cutting plane (Phase 2)
 */
function LaserLine({ isActive, progress, opacity = 1 }) {
  if (!isActive || progress <= 0 || opacity <= 0) return null

  const progressClamped = Math.min(progress, 1)
  const planeY = 0.85 - progressClamped * 1.7
  const glow = Math.sin(progressClamped * Math.PI) * 0.7 + 0.6
  const pulse = Math.sin(progressClamped * Math.PI * 3) * 0.2 + 0.85

  return (
    <group position={[0, DATA_BLOCK_Y, 0]}>
      {/* Solid horizontal laser plane */}
      <mesh position={[0, planeY, 0]}>
        <boxGeometry args={[1.6, 0.06, 1.6]} />
        <meshBasicMaterial
          color="#ff1111"
          transparent
          opacity={glow * pulse * 0.95 * opacity}
          fog={false}
        />
      </mesh>

      {/* Inner glow shell */}
      <mesh position={[0, planeY, 0]}>
        <boxGeometry args={[1.75, 0.12, 1.75]} />
        <meshBasicMaterial
          color="#ff6655"
          transparent
          opacity={glow * 0.45 * opacity}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      {/* Outer glow shell */}
      <mesh position={[0, planeY, 0]}>
        <boxGeometry args={[1.95, 0.18, 1.95]} />
        <meshBasicMaterial
          color="#ff9999"
          transparent
          opacity={glow * 0.25 * opacity}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  )
}

/**
 * Segment - Individual data segment with optional TCP header (Phase 2/3)
 */
function Segment({ index, position, color, showHeader }) {
  const groupRef = useRef()
  const segmentMeshRef = useRef()
  const headerRef = useRef()
  const [segmentX, setSegmentX] = useState(0) // Start from center
  const [segmentOpacity, setSegmentOpacity] = useState(0)
  const [headerScale, setHeaderScale] = useState(0)
  const [headerY, setHeaderY] = useState(1.0)

  // Slide animation from center to final position
  useEffect(() => {
    const delay = index * ANIMATION_CONFIG.segmentStagger
    
    gsap.to({ x: 0, opacity: 0 }, {
      x: position[0],
      opacity: 1,
      duration: ANIMATION_CONFIG.segmentSlide.duration,
      delay: delay,
      ease: ANIMATION_CONFIG.segmentSlide.ease,
      onUpdate: function() {
        setSegmentX(this.targets()[0].x)
        setSegmentOpacity(this.targets()[0].opacity)
      },
    })
  }, [index, position])

  // Header attachment animation
  useEffect(() => {
    if (showHeader) {
      gsap.to({ scale: 0, y: 1.0 }, {
        scale: 1,
        y: 0.48,
        duration: ANIMATION_CONFIG.headerDuration,
        delay: ANIMATION_CONFIG.headerDelay + index * 0.08,
        ease: 'back.out(1.7)',
        onUpdate: function() {
          setHeaderScale(this.targets()[0].scale)
          setHeaderY(this.targets()[0].y)
        },
      })
    } else {
      setHeaderScale(0)
      setHeaderY(1.0)
    }
  }, [showHeader, index])

  useFrame((state) => {
    try {
      const t = state.clock.elapsedTime
      
      if (groupRef.current) {
        // Gentle floating at final position
        groupRef.current.position.y = position[1] + Math.sin(t * 0.8 + index * 0.9) * 0.04
      }
      
      if (segmentMeshRef.current && segmentMeshRef.current.material) {
        segmentMeshRef.current.material.emissiveIntensity = 0.32 + Math.sin(t * 1.2 + index) * 0.15
      }
      
      if (headerRef.current && showHeader && headerRef.current.material) {
        headerRef.current.material.emissiveIntensity = 0.6 + Math.sin(t * 2.2 + index) * 0.3
      }
    } catch {
      // Silently fail if frame updates fail
    }
  })

  const payloadSize = 1460
  const seqNum = index * payloadSize + 1
  const ackNum = seqNum + payloadSize

  if (segmentOpacity === 0) return null

  return (
    <group ref={groupRef} position={[segmentX, position[1], position[2]]}>
      {/* Segment body - smaller piece */}
      <mesh ref={segmentMeshRef} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshPhongMaterial
          color={color.main}
          emissive={color.emissive}
          emissiveIntensity={0.35}
          shininess={130}
          transparent
          opacity={segmentOpacity}
        />
      </mesh>

      {/* Enhanced glow shell - more vibrant */}
      <mesh>
        <boxGeometry args={[0.82, 0.82, 0.82]} />
        <meshBasicMaterial
          color={color.main}
          transparent
          opacity={0.18 * segmentOpacity}
          depthWrite={false}
        />
      </mesh>

      {/* TCP Header (Phase 3) */}
      {showHeader && headerScale > 0 && (
        <group scale={headerScale}>
          <mesh ref={headerRef} position={[0, headerY, 0.40]}>
            <boxGeometry args={[0.64, 0.24, 0.18]} />
            <meshPhongMaterial
              color="#0ea5e9"
              emissive="#0284c7"
              emissiveIntensity={0.6}
              shininess={150}
            />
          </mesh>
          
          {/* Header attachment glow effect */}
          <mesh position={[0, headerY, 0.40]}>
            <boxGeometry args={[0.72, 0.30, 0.24]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.18 * headerScale}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Segment label */}
      <Html position={[0, -0.62, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(0,0,0,0.88)',
          color: color.main,
          padding: '5px 12px',
          borderRadius: '6px',
          border: `1.5px solid ${color.main}`,
          fontSize: '9px',
          fontWeight: '900',
          fontFamily: 'monospace',
          letterSpacing: '0.6px',
          boxShadow: `0 0 12px ${color.main}77, 0 4px 10px rgba(0,0,0,0.9)`,
          textShadow: `0 0 6px ${color.main}`,
          opacity: segmentOpacity,
        }}>
          SEG {index + 1}
        </div>
      </Html>

      {/* TCP Header label (Phase 3) */}
      {showHeader && (
        <Html position={[0, 0.95, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(2,132,199,0.8), rgba(6,182,212,0.45))',
            backdropFilter: 'blur(16px)',
            border: '2px solid #38bdf8',
            borderRadius: '12px',
            padding: '3px 4px',
            color: '#e0f2fe',
            boxShadow: '0 0 18px rgba(56,189,248,0.95), 0 8px 20px rgba(0,0,0,0.85)',
            letterSpacing: '0px',
            textShadow: '0 0 8px rgba(125,211,252,1)',
            fontFamily: 'monospace',
            minWidth: '100px',
            maxWidth: '110px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            {/* TCP Header Title */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0px',
              fontSize: '8px',
              fontWeight: '900',
              marginBottom: '2px',
              paddingBottom: '2px',
              borderBottom: '1.5px solid rgba(56,189,248,0.5)',
              color: '#a5f3fc',
              letterSpacing: '2px',
              width: '100%',
            }}>
              TCP HEADER
            </div>

            {/* Segment Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1px',
              width: '100%',
            }}>
              <span style={{
                background: 'rgba(16,185,129,0.4)',
                border: '1px solid #10b981',
                borderRadius: '3px',
                padding: '1px 5px',
                color: '#34d399',
                fontWeight: '900',
                fontSize: '7px',
              }}>SEGMENT {index + 1} / 4</span>
            </div>

            {/* Header Fields */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              marginTop: '2px',
              fontSize: '7px',
              fontWeight: '800',
              width: '100%',
              alignItems: 'center',
              letterSpacing: '2px',
            }}>
              <div style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#7dd3fc' }}>SEQ</span>
                <span style={{ color: '#ffffff' }}>{seqNum}</span>
              </div>
              <div style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#7dd3fc' }}>LEN</span>
                <span style={{ color: '#a5f3fc' }}>{payloadSize}B</span>
              </div>
              <div style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#7dd3fc' }}>ACK</span>
                <span style={{ color: '#ffffff' }}>{ackNum}</span>
              </div>
              <div style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#7dd3fc' }}>FLG</span>
                <span style={{ color: '#34d399' }}>A,P</span>
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * FlowConnector - Horizontal separation line showing split from center
 */
function FlowConnector({ segmentPosition, color, index }) {
  const [lineOpacity, setLineOpacity] = useState(0)

  useEffect(() => {
    const delay = index * ANIMATION_CONFIG.segmentStagger
    gsap.to({ opacity: 0 }, {
      opacity: 1,
      duration: 0.8,
      delay: delay,
      ease: 'power2.out',
      onUpdate: function() {
        setLineOpacity(this.targets()[0].opacity)
      },
    })
  }, [index])

  if (lineOpacity === 0) return null

  // Simple horizontal line from center to segment
  const centerPoint = [0, DATA_BLOCK_Y, 0]
  const segmentPoint = [segmentPosition[0], DATA_BLOCK_Y, 0]

  return (
    <group>
      {/* Connection line */}
      <Line
        points={[centerPoint, segmentPoint]}
        color={color.main}
        lineWidth={2.5}
        transparent
        opacity={0.5 * lineOpacity}
        dashed
        dashScale={2}
        dashSize={0.15}
        gapSize={0.1}
      />

      {/* Glowing core */}
      <Line
        points={[centerPoint, segmentPoint]}
        color={color.main}
        lineWidth={1.2}
        transparent
        opacity={0.8 * lineOpacity}
      />
    </group>
  )
}

/**
 * TravelingSegment - Segment traveling from source to server (Phase 4)
 * Enhanced with glow trails and vibrant visual feedback
 */
function TravelingSegment({ segmentId, dispatchOrder, startPosition, color, arrivalSlot, onReachServer }) {
  const meshRef = useRef()
  const glowRef1 = useRef()
  const glowRef2 = useRef()
  const containerRef = useRef()
  const [position, setPosition] = useState(startPosition)
  const [opacity, setOpacity] = useState(1)
  const [scale, setScale] = useState(1)
  const [emissiveIntensity, setEmissiveIntensity] = useState(0.5)
  const [glowScale, setGlowScale] = useState(1)
  const [isArrivingAtSlot, setIsArrivingAtSlot] = useState(false)

  useEffect(() => {
    const delay = dispatchOrder * ANIMATION_CONFIG.transmission.stagger
    const duration = ANIMATION_CONFIG.transmission.duration
    const arcHeight = ANIMATION_CONFIG.transmission.arcHeight
    
    // Calculate destination
    let destination
    if (arrivalSlot !== undefined) {
      // Match BufferSlot positions: 0.56 slot size + 0.06 gap = 0.62
      const slotSize = 0.56
      const slotGap = 0.06
      const spacing = slotSize + slotGap
      const slotPositions = {
        0: [-1.5 * spacing, 0, 0],
        1: [-0.5 * spacing, 0, 0],
        2: [0.5 * spacing, 0, 0],
        3: [1.5 * spacing, 0, 0],
      }
      const basePos = slotPositions[arrivalSlot] || [0, 0, 0]
      destination = [SERVER_POSITION[0] + basePos[0], SERVER_POSITION[1], SERVER_POSITION[2]]
    } else {
      destination = SERVER_POSITION
    }

    // Travel from start to server with arc
    gsap.to({ 
      x: startPosition[0], 
      y: startPosition[1], 
      z: startPosition[2],
      progress: 0
    }, {
      x: destination[0],
      y: destination[1],
      z: destination[2],
      progress: 1,
      duration: duration,
      delay: delay,
      ease: ANIMATION_CONFIG.transmission.ease,
      onUpdate: function() {
        const prog = this.targets()[0].progress
        const x = this.targets()[0].x
        const y = this.targets()[0].y
        const z = this.targets()[0].z
        
        // Add arc to Y position (parabolic curve)
        const arcY = y + Math.sin(prog * Math.PI) * arcHeight
        
        setPosition([x, arcY, z])
        
        // Enhance glow as it gets closer to destination (progress towards end)
        const proximityGlow = 0.4 + (prog * 0.6)
        setEmissiveIntensity(proximityGlow)
        
        // Trigger slot arrival visual at 85% of journey
        if (prog > 0.85 && !isArrivingAtSlot) {
          setIsArrivingAtSlot(true)
        }
      },
      onComplete: () => {
        // Pull into slot with smooth absorption animation
        gsap.to({ op: 1, sc: 1, glow: 1 }, {
          op: 0,
          sc: 0.1,
          glow: 0,
          duration: 0.6,
          ease: 'back.in(1.5)',
          onUpdate: function() {
            setOpacity(this.targets()[0].op)
            setScale(this.targets()[0].sc)
            setGlowScale(this.targets()[0].glow)
          },
          onComplete: () => {
            if (onReachServer) {
              if (arrivalSlot !== undefined) {
                // Out-of-order mode: pass segment ID and slot index
                onReachServer(segmentId, arrivalSlot)
              } else {
                // Normal mode: just pass segment ID
                onReachServer(segmentId)
              }
            }
          }
        })
      }
    })
  }, [segmentId, dispatchOrder, startPosition, arrivalSlot, onReachServer]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state) => {
    if (!meshRef.current) return
    
    try {
      const t = state.clock.elapsedTime
      
      // More dynamic rotation during travel
      meshRef.current.rotation.y += 0.08
      meshRef.current.rotation.x = Math.sin(t * 2.5) * 0.4
      meshRef.current.rotation.z = Math.sin(t * 1.8) * 0.2
      
      if (meshRef.current.material && meshRef.current.material.emissiveIntensity !== undefined) {
        meshRef.current.material.emissiveIntensity = emissiveIntensity
      }

      // Animate glow layers
      if (glowRef1.current && glowRef2.current) {
        glowRef1.current.scale.setScalar(1 + Math.sin(t * 3) * 0.15)
        glowRef2.current.scale.setScalar(1.35 + Math.sin(t * 2.5) * 0.2)
      }
    } catch {
      // Silently fail if frame updates fail
    }
  })

  if (opacity === 0) return null

  // Size matches slot size in out-of-order mode
  const segmentSize = arrivalSlot !== undefined ? 0.5 : 0.7

  return (
    <group ref={containerRef} position={position} scale={scale}>
      {/* Arrival flash effect when packet reaches slot */}
      {isArrivingAtSlot && arrivalSlot !== undefined && (
        <mesh position={[0, 0, 0.1]}>
          <boxGeometry args={[segmentSize + 0.3, segmentSize + 0.3, segmentSize + 0.3]} />
          <meshBasicMaterial
            color={color.main}
            transparent
            opacity={0.6}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Core segment mesh - solid filled color */}
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[segmentSize, segmentSize, segmentSize]} />
        <meshPhongMaterial
          color={color.main}
          emissive={color.emissive}
          emissiveIntensity={0.4}
          shininess={130}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Inner glow shell - pulsing */}
      <mesh ref={glowRef1}>
        <boxGeometry args={[segmentSize + 0.12, segmentSize + 0.12, segmentSize + 0.12]} />
        <meshBasicMaterial
          color={color.main}
          transparent
          opacity={0.35 * opacity}
          depthWrite={false}
        />
      </mesh>

      {/* Outer glow shell - expanding */}
      <mesh ref={glowRef2}>
        <boxGeometry args={[segmentSize + 0.3, segmentSize + 0.3, segmentSize + 0.3]} />
        <meshBasicMaterial
          color={color.main}
          transparent
          opacity={0.15 * opacity * glowScale}
          depthWrite={false}
        />
      </mesh>

      {/* Trail glow - fades after travel */}
      <mesh>
        <boxGeometry args={[segmentSize + 0.5, segmentSize + 0.5, segmentSize + 0.5]} />
        <meshBasicMaterial
          color={color.main}
          transparent
          opacity={0.04 * opacity * glowScale}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// ============================================================================
// PHASE 5: BUFFER GRID & SLOT COMPONENTS
// ============================================================================

/**
 * BufferSlot - Individual slot in the buffer grid
 * Shows slot number and animates fill/empty state with dynamic feedback
 */
function BufferSlot({ slotNumber, isFilled, isBlinking, isWaiting, fillColor, isOutOfOrder, isReassembling }) {
  const meshRef = useRef(null)
  const glowRef = useRef(null)
  const flashRef = useRef(null)
  const alertFlashRef = useRef(null)
  const animRef = useRef(null)
  const blinkRef = useRef(null)
  const waitingRef = useRef(null)
  const [blinkOpacity, setBlinkOpacity] = useState(1)
  const [blinkScale, setBlinkScale] = useState(1)
  const [fillScale, setFillScale] = useState(1)
  const [flashOpacity, setFlashOpacity] = useState(0)
  const [alertFlashOpacity, setAlertFlashOpacity] = useState(0)
  const [waitingPulse, setWaitingPulse] = useState(1)

  // Fill animation - pop effect when filled
  useEffect(() => {
    if (animRef.current) {
      animRef.current.kill()
    }

    if (isFilled) {
      setFillScale(0.3)
      setFlashOpacity(0)

      // Delay the animation slightly so it syncs with the traveling segment arrival
      const timeoutId = setTimeout(() => {
        // Pop animation: scale from 0.3 (just arrived) → 1.2 → 1.0
        animRef.current = gsap.to({ scale: 0.3 }, {
          scale: 1.2,
          duration: 0.5,
          ease: 'back.out(2)',
          onUpdate: function() {
            setFillScale(this.targets()[0].scale)
          },
        })

        // Then scale down to 1.0
        gsap.to({ scale: 1.2 }, {
          scale: 1,
          duration: 0.25,
          delay: 0.5,
          ease: 'power2.out',
          onUpdate: function() {
            setFillScale(this.targets()[0].scale)
          },
        })

        // Flash effect when filled
        gsap.to({ flash: 0 }, {
          flash: 1,
          duration: 0.25,
          ease: 'power2.out',
          onUpdate: function() {
            setFlashOpacity(this.targets()[0].flash)
          },
        })

        // Flash fade out
        gsap.to({ flash: 1 }, {
          flash: 0,
          duration: 0.7,
          delay: 0.25,
          ease: 'power2.in',
          onUpdate: function() {
            setFlashOpacity(this.targets()[0].flash)
          },
        })
      }, 120)

      return () => {
        clearTimeout(timeoutId)
        if (animRef.current) {
          animRef.current.kill()
        }
      }
    } else {
      setFillScale(1)
      setFlashOpacity(0)
    }

    return () => {
      if (animRef.current) {
        animRef.current.kill()
      }
    }
  }, [isFilled])

  // Enhanced blinking animation for missing segments with size pulse
  useEffect(() => {
    if (blinkRef.current) {
      blinkRef.current.kill()
    }

    if (isBlinking) {
      blinkRef.current = gsap.timeline({ repeat: -1 })
      
      blinkRef.current.to({ opacity: 1, scale: 1 }, {
        opacity: 0.25,
        scale: 1.08,
        duration: 0.4,
        ease: 'power2.inOut',
        onUpdate: function() {
          setBlinkOpacity(this.targets()[0].opacity)
          setBlinkScale(this.targets()[0].scale)
        },
      })
      
      blinkRef.current.to({ opacity: 0.25, scale: 1.08 }, {
        opacity: 1,
        scale: 1,
        duration: 0.4,
        ease: 'power2.inOut',
        onUpdate: function() {
          setBlinkOpacity(this.targets()[0].opacity)
          setBlinkScale(this.targets()[0].scale)
        },
      }, 0.4)

      return () => {
        if (blinkRef.current) {
          blinkRef.current.kill()
        }
      }
    } else {
      setBlinkOpacity(1)
      setBlinkScale(1)
    }
  }, [isBlinking])

  // Waiting animation for slots that are skipped due to out-of-order arrivals
  useEffect(() => {
    if (waitingRef.current) {
      waitingRef.current.kill()
    }

    if (isWaiting && !isFilled) {
      waitingRef.current = gsap.timeline({ repeat: -1 })
      
      waitingRef.current.to({ pulse: 1 }, {
        pulse: 1.12,
        duration: 0.6,
        ease: 'sine.inOut',
        onUpdate: function() {
          setWaitingPulse(this.targets()[0].pulse)
        },
      })
      
      waitingRef.current.to({ pulse: 1.12 }, {
        pulse: 1,
        duration: 0.6,
        ease: 'sine.inOut',
        onUpdate: function() {
          setWaitingPulse(this.targets()[0].pulse)
        },
      }, 0.6)

      return () => {
        if (waitingRef.current) {
          waitingRef.current.kill()
        }
      }
    } else {
      setWaitingPulse(1)
    }
  }, [isWaiting, isFilled])

  // Out-of-order alert flash
  useEffect(() => {
    if (isOutOfOrder) {
      gsap.to({ flash: 0 }, {
        flash: 1,
        duration: 0.15,
        ease: 'power2.out',
        onUpdate: function() {
          setAlertFlashOpacity(this.targets()[0].flash)
        },
      })

      gsap.to({ flash: 1 }, {
        flash: 0,
        duration: 0.5,
        delay: 0.15,
        ease: 'power2.in',
        onUpdate: function() {
          setAlertFlashOpacity(this.targets()[0].flash)
        },
      })
    }
  }, [isOutOfOrder])

  useFrame(() => {
    if (!meshRef.current || !isFilled) return

    try {
      const t = performance.now() * 0.003
      meshRef.current.rotation.z += 0.015
      
      // Enhanced glow when filling arrives
      if (meshRef.current.material && meshRef.current.material.emissiveIntensity !== undefined) {
        meshRef.current.material.emissiveIntensity = isReassembling 
          ? 0.6 + Math.sin(t * 4) * 0.3  // More dramatic pulse during reassembly
          : 0.35 + Math.sin(t) * 0.15     // Normal pulse when settled
      }
    } catch {
      // Silently fail if mesh properties are not available
    }
  })

  // Slot position on grid - compact layout for cubic server
  const slotSize = 0.56
  const slotGap = 0.06
  const positions = {
    1: [-1.5 * (slotSize + slotGap), 0, 0],
    2: [-0.5 * (slotSize + slotGap), 0, 0],
    3: [0.5 * (slotSize + slotGap), 0, 0],
    4: [1.5 * (slotSize + slotGap), 0, 0],
  }

  const slotPos = positions[slotNumber]

  return (
    <group position={slotPos} scale={isBlinking ? blinkScale : 1}>
      {/* Wireframe border - always visible */}
      <mesh>
        <boxGeometry args={[slotSize, slotSize, slotSize]} />
        <meshBasicMaterial
          color={isBlinking ? '#ef4444' : isWaiting ? '#fbbf24' : '#38bdf8'}
          wireframe={true}
          transparent
          opacity={isBlinking ? blinkOpacity * 0.95 : 0.95}
        />
      </mesh>

      {/* Waiting state glow - subtle */}
      {isWaiting && !isFilled && (
        <mesh>
          <boxGeometry args={[slotSize * 1.08, slotSize * 1.08, slotSize * 1.08]} />
          <meshBasicMaterial
            color="#fbbf24"
            transparent
            opacity={0.08 * waitingPulse}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Fill box - solid filled block when segment arrives */}
      {isFilled && (
        <>
          {/* Solid filled colour block */}
          <mesh ref={meshRef} position={[0, 0.01, 0]} scale={fillScale}>
            <boxGeometry args={[slotSize - 0.12, slotSize - 0.12, slotSize - 0.12]} />
            <meshPhongMaterial
              color={fillColor}
              emissive="#0ea5e9"
              emissiveIntensity={0.35}
              shininess={130}
              transparent
              opacity={0.85}
              depthWrite={true}
            />
          </mesh>

          {/* Inner glow effect */}
          <mesh ref={glowRef} position={[0, 0.01, 0]} scale={fillScale}>
            <boxGeometry args={[slotSize - 0.05, slotSize - 0.05, slotSize - 0.05]} />
            <meshBasicMaterial
              color={fillColor}
              transparent
              opacity={0.25}
              depthWrite={false}
            />
          </mesh>

          {/* Outer absorption glow */}
          <mesh position={[0, 0.01, 0]} scale={fillScale * 1.15}>
            <boxGeometry args={[slotSize - 0.05, slotSize - 0.05, slotSize - 0.05]} />
            <meshBasicMaterial
              color={fillColor}
              transparent
              opacity={0.12}
              depthWrite={false}
            />
          </mesh>

          {/* Flash white glow on fill */}
          {flashOpacity > 0 && (
            <mesh ref={flashRef} position={[0, 0.01, 0]} scale={fillScale}>
              <boxGeometry args={[slotSize + 0.05, slotSize + 0.05, slotSize + 0.05]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={flashOpacity * 0.6}
                depthWrite={false}
              />
            </mesh>
          )}

          {/* Out-of-order red alert flash */}
          {alertFlashOpacity > 0 && (
            <mesh ref={alertFlashRef} position={[0, 0.01, 0]} scale={fillScale}>
              <boxGeometry args={[slotSize + 0.1, slotSize + 0.1, slotSize + 0.1]} />
              <meshBasicMaterial
                color="#ef4444"
                transparent
                opacity={alertFlashOpacity * 0.8}
                depthWrite={false}
              />
            </mesh>
          )}
        </>
      )}

      {/* Slot sequence number - LED style display */}
      {!isFilled && (
        <Html distanceFactor={1.2} position={[0, 0, 0.35]}>
          <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-gray-900 border-2 border-gray-700 shadow-xl" style={{
            boxShadow: `0 0 12px ${isBlinking ? '#ef4444' : isWaiting ? '#fbbf24' : '#38bdf8'}80`
          }}>
            <div style={{
              fontSize: '40px',
              fontWeight: '900',
              fontFamily: 'monospace',
              color: isBlinking ? '#ef4444' : isWaiting ? '#fbbf24' : '#38bdf8',
              textShadow: `0 0 8px ${isBlinking ? '#ef4444' : isWaiting ? '#fbbf24' : '#38bdf8'}cc`,
              userSelect: 'none'
            }}>
              {slotNumber}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * BufferGrid - Complete buffer with 4 slots and merge animation
 * Enhanced with dramatic visual feedback for reordering and merging
 */
function BufferGrid({ slotStates, isScanning, showMerged, mergedScale, outOfOrderAlerts, isReassembling, reassemblyProgress, expectedSequence, receivedSegmentsCount, waitingStates }) {
  const groupRef = useRef(null)
  const scanLineRef = useRef(null)
  const goldCubeRef = useRef(null)
  const goldInnerGlowRef = useRef(null)
  const goldOuterGlowRef = useRef(null)
  const cornerRef1 = useRef(null)
  const cornerRef2 = useRef(null)
  const cornerRef3 = useRef(null)
  const cornerRef4 = useRef(null)
  const [scanPosition, setScanPosition] = useState(-1.0)
  const [scanGlowOpacity, setScanGlowOpacity] = useState(1)

  // Green scan effect - enhanced with glow trails
  useEffect(() => {
    if (isScanning && scanLineRef.current) {
      gsap.to({ x: -1.0, glow: 1 }, {
        x: 1.0,
        glow: 0,
        duration: 1.8,
        ease: 'power2.inOut',
        onUpdate: function() {
          setScanPosition(this.targets()[0].x)
          setScanGlowOpacity(this.targets()[0].glow)
        },
      })
    }
  }, [isScanning])

  // Pulse corner accents and rotate gold cube with enhanced effects
  useFrame((state) => {
    try {
      const t = state.clock.elapsedTime
      const pulse = 0.7 + Math.sin(t * 2) * 0.3
      
      if (cornerRef1.current) cornerRef1.current.scale.setScalar(pulse)
      if (cornerRef2.current) cornerRef2.current.scale.setScalar(pulse)
      if (cornerRef3.current) cornerRef3.current.scale.setScalar(pulse)
      if (cornerRef4.current) cornerRef4.current.scale.setScalar(pulse)
      
      // Rotate gold cube with enhanced dynamics
      if (goldCubeRef.current && showMerged && mergedScale > 0) {
        goldCubeRef.current.rotation.y += 0.025
        goldCubeRef.current.rotation.x = Math.sin(t * 0.6) * 0.15
        goldCubeRef.current.rotation.z = Math.sin(t * 0.4) * 0.08
      }

      // Animate glow layers
      if (goldInnerGlowRef.current && showMerged && goldInnerGlowRef.current.material) {
        const glowPulse = 0.35 + Math.sin(t * 2.5) * 0.15
        goldInnerGlowRef.current.material.opacity = glowPulse
      }

      if (goldOuterGlowRef.current && showMerged && goldOuterGlowRef.current.material) {
        const outerGlowPulse = 0.2 + Math.sin(t * 1.8) * 0.12
        goldOuterGlowRef.current.material.opacity = outerGlowPulse
      }
    } catch {
      // Silently fail if frame updates fail
    }
  })

  return (
    <group ref={groupRef} position={SERVER_POSITION}>
      {/* Server chassis - dark transparent background panel */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.15, 2.15, 2.15]} />
        <meshBasicMaterial
          color="#060d1a"
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>

      {/* Server box frame - bright cyan wireframe outline */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.2, 2.2, 2.2]} />
        <meshBasicMaterial
          color="#38bdf8"
          wireframe={true}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Enhanced border frame - outer edges - bright cyan (subtle, outline-only) */}
      <mesh position={[0, 0, 1.12]}>
        <boxGeometry args={[2.25, 2.25, 0.08]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.2} />
      </mesh>
      <mesh position={[0, 0, -1.12]}>
        <boxGeometry args={[2.25, 2.25, 0.08]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.2} />
      </mesh>
      <mesh position={[1.12, 0, 0]}>
        <boxGeometry args={[0.08, 2.25, 2.25]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.2} />
      </mesh>
      <mesh position={[-1.12, 0, 0]}>
        <boxGeometry args={[0.08, 2.25, 2.25]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.2} />
      </mesh>

      {/* Top status strip */}
      <mesh position={[0, 0.96, 0.92]}>
        <boxGeometry args={[1.85, 0.09, 0.08]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} />
      </mesh>

      {/* Bottom status strip */}
      <mesh position={[0, -0.96, 0.92]}>
        <boxGeometry args={[1.85, 0.09, 0.08]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.5} />
      </mesh>

      {/* Corner accents - Top Left */}
      <mesh ref={cornerRef1} position={[-1.15, 1.15, 1.15]}>
        <boxGeometry args={[0.16, 0.16, 0.16]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.9} />
      </mesh>

      {/* Corner accents - Top Right */}
      <mesh ref={cornerRef2} position={[1.15, 1.15, 1.15]}>
        <boxGeometry args={[0.16, 0.16, 0.16]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.9} />
      </mesh>

      {/* Corner accents - Bottom Left */}
      <mesh ref={cornerRef3} position={[-1.15, -1.15, 1.15]}>
        <boxGeometry args={[0.16, 0.16, 0.16]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.9} />
      </mesh>

      {/* Corner accents - Bottom Right */}
      <mesh ref={cornerRef4} position={[1.15, -1.15, 1.15]}>
        <boxGeometry args={[0.16, 0.16, 0.16]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.9} />
      </mesh>

      {/* Server identity badge - always visible; Y=-1.52 places it just below the 2.2-unit-tall server box */}
      <Html distanceFactor={1.2} position={[0, -1.52, 0]}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(8,47,73,0.95), rgba(12,74,110,0.9))',
          border: '2px solid rgba(56,189,248,0.7)',
          borderRadius: '8px',
          padding: '4px 14px',
          color: '#7dd3fc',
          fontSize: '10px',
          fontWeight: '900',
          fontFamily: 'monospace',
          letterSpacing: '2px',
          textShadow: '0 0 8px rgba(56,189,248,0.9)',
          boxShadow: '0 0 14px rgba(56,189,248,0.5), 0 4px 10px rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
        }}>
          🖥️ SERVER · OUT-OF-ORDER BUFFER
        </div>
      </Html>

      {/* Buffer container status label */}
      <Html distanceFactor={1.2} position={[0, 1.52, 0]}>
        <div className="text-xs font-bold text-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-900/95 to-indigo-800/95 border-2 border-cyan-400/80 text-cyan-300 whitespace-nowrap shadow-lg">
          {isReassembling 
            ? '🔄 REASSEMBLING: Extracting [1→2→3→4]'
            : isScanning
            ? '✓ All 4 Packets Received! Reordering Buffer...'
            : receivedSegmentsCount === 0
            ? '📥 Waiting for TCP Packets...'
            : `📥 Received ${receivedSegmentsCount}/4 · Arrival: 1→3→2→4 · Next SEQ ${expectedSequence}`}
        </div>
      </Html>

      {/* Slot 1 */}
      <BufferSlot
        slotNumber={1}
        isFilled={slotStates[0]}
        isBlinking={!slotStates[0] && expectedSequence === 1 && !isScanning && !isReassembling}
        isWaiting={waitingStates[0]}
        fillColor="#38bdf8"
        isOutOfOrder={outOfOrderAlerts[0]}
        isReassembling={isReassembling && reassemblyProgress > 0}
      />

      {/* Slot 2 - Can enter waiting state */}
      <BufferSlot
        slotNumber={2}
        isFilled={slotStates[1]}
        isBlinking={!slotStates[1] && expectedSequence === 2 && !isScanning && !isReassembling}
        isWaiting={waitingStates[1]}
        fillColor="#38bdf8"
        isOutOfOrder={outOfOrderAlerts[1]}
        isReassembling={isReassembling && reassemblyProgress > 1}
      />

      {/* Slot 3 */}
      <BufferSlot
        slotNumber={3}
        isFilled={slotStates[2]}
        isBlinking={!slotStates[2] && expectedSequence === 3 && !isScanning && !isReassembling}
        isWaiting={waitingStates[2]}
        fillColor="#38bdf8"
        isOutOfOrder={outOfOrderAlerts[2]}
        isReassembling={isReassembling && reassemblyProgress > 2}
      />

      {/* Slot 4 */}
      <BufferSlot
        slotNumber={4}
        isFilled={slotStates[3]}
        isBlinking={!slotStates[3] && expectedSequence === 4 && !isScanning && !isReassembling}
        isWaiting={waitingStates[3]}
        fillColor="#38bdf8"
        isOutOfOrder={outOfOrderAlerts[3]}
        isReassembling={isReassembling && reassemblyProgress > 3}
      />

      {/* Green scan line - appears when all slots filled */}
      {isScanning && (
        <>
          {/* Main scan line */}
          <mesh ref={scanLineRef} position={[scanPosition, 0, 0.2]}>
            <boxGeometry args={[0.1, 1.5, 1.5]} />
            <meshBasicMaterial
              color="#10b981"
              transparent
              opacity={0.85}
            />
          </mesh>

          {/* Scan line glow trail */}
          <mesh position={[scanPosition - 0.2, 0, 0.2]}>
            <boxGeometry args={[0.16, 1.62, 1.62]} />
            <meshBasicMaterial
              color="#10b981"
              transparent
              opacity={scanGlowOpacity * 0.5}
              depthWrite={false}
            />
          </mesh>

          {/* Extended glow */}
          <mesh position={[scanPosition - 0.4, 0, 0.2]}>
            <boxGeometry args={[0.24, 1.76, 1.76]} />
            <meshBasicMaterial
              color="#10b981"
              transparent
              opacity={scanGlowOpacity * 0.2}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {/* Merged gold cube with enhanced animation */}
      {showMerged && (
        <group ref={goldCubeRef} position={[0, 0, 0.2]} scale={mergedScale}>
          {/* Core gold cube - outline only */}
          <mesh>
            <boxGeometry args={[0.82, 0.82, 0.82]} />
            <meshBasicMaterial
              color="#fbbf24"
              wireframe={true}
              transparent
              opacity={0.95}
            />
          </mesh>
          
          {/* Inner glow - subtle */}
          <mesh ref={goldInnerGlowRef}>
            <boxGeometry args={[0.95, 0.95, 0.95]} />
            <meshBasicMaterial
              color="#fbbf24"
              transparent
              opacity={0.15}
              depthWrite={false}
            />
          </mesh>

          {/* Middle glow layer */}
          <mesh>
            <boxGeometry args={[1.08, 1.08, 1.08]} />
            <meshBasicMaterial
              color="#fdba74"
              transparent
              opacity={0.08}
              depthWrite={false}
            />
          </mesh>

          {/* Outer expansive glow */}
          <mesh ref={goldOuterGlowRef}>
            <boxGeometry args={[1.22, 1.22, 1.22]} />
            <meshBasicMaterial
              color="#fbbf24"
              transparent
              opacity={0.1}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
      
      {/* Label for merged cube with enhanced styling */}
      {showMerged && (
        <Html distanceFactor={1.2} position={[0, 0.8, 0.2]}>
          <div className="text-[11px] font-black text-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600/95 via-yellow-600/95 to-amber-600/95 border-2 border-yellow-300 text-white whitespace-nowrap shadow-2xl animate-pulse">
            ✨ REASSEMBLED & REORDERED
          </div>
        </Html>
      )}
    </group>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * SegmentationStage - TCP Segmentation Visualization
 * 
 * Controlled component that responds to external phase changes:
 * - Phase 1: Shows data block
 * - Phase 2: Animates laser cutting and reveals segments
 * - Phase 3: Attaches TCP headers to segments
 * - Phase 4: Segments travel to server and reassemble
 * - Phase 5 (Out-of-Order): Buffer grid with reordering (when outOfOrder=true)
 * 
 * @param {number} externalPhase - Current phase (1, 2, 3, or 4) controlled by parent
 * @param {boolean} outOfOrder - Enable Phase 5 out-of-order simulation
 */
export default function SegmentationStage({ externalPhase = 1, outOfOrder = false }) {
  // Animation state
  const [cubeOpacity, setCubeOpacity] = useState(1)
  const [laserProgress, setLaserProgress] = useState(0)
  const [laserOpacity, setLaserOpacity] = useState(1)
  const [segmentsVisible, setSegmentsVisible] = useState(false)
  const [segmentKey, setSegmentKey] = useState(0) // Force re-render segments
  
  // Phase 4 state
  const [travelingSegments, setTravelingSegments] = useState([])
  const [_segmentsArrived, setSegmentsArrived] = useState(0)
  const [showReassembled, setShowReassembled] = useState(false)
  const [successFlash, setSuccessFlash] = useState(0)
  const [showServerCube, setShowServerCube] = useState(false)
  const [showConnectionLine, setShowConnectionLine] = useState(false)
  const [hideSourceSegments, setHideSourceSegments] = useState(false)

  // Phase 5 (Out-of-Order) state
  const [showBufferGrid, setShowBufferGrid] = useState(false)
  const [slotStates, setSlotStates] = useState([false, false, false, false]) // [slot1, slot2, slot3, slot4]
  const [waitingStates, setWaitingStates] = useState([false, false, false, false]) // Slots in waiting phase
  const [isScanning, setIsScanning] = useState(false)
  const [showMergedCube, setShowMergedCube] = useState(false)
  const [mergedScale, setMergedScale] = useState(0)
  const [successMessage, setSuccessMessage] = useState('')
  const [receivedSegmentsCount, setReceivedSegmentsCount] = useState(0)
  const [expectedSequence, setExpectedSequence] = useState(1) // Next sequence we're looking for
  const [outOfOrderAlerts, setOutOfOrderAlerts] = useState([false, false, false, false]) // Visual alert per slot
  const [reassemblyProgress, setReassemblyProgress] = useState(0) // 0-4 packets reassembled
  const [isReassembling, setIsReassembling] = useState(false) // Reassembly in progress
  
  // Track previous phase to detect changes
  const prevPhaseRef = useRef(externalPhase)

  // Respond to phase changes with animations
  useEffect(() => {
    const prevPhase = prevPhaseRef.current
    prevPhaseRef.current = externalPhase

    // Phase 1: Reset everything with smooth transition
    if (externalPhase === 1) {
      gsap.to({ opacity: 1 }, {
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
        onUpdate: function() {
          setCubeOpacity(this.targets()[0].opacity)
        },
      })
      setLaserProgress(0)
      setLaserOpacity(1)
      setSegmentsVisible(false)
      setSegmentKey(prev => prev + 1) // Reset segment animations
      
      // Reset Phase 4 state
      setTravelingSegments([])
      setSegmentsArrived(0)
      setShowReassembled(false)
      setSuccessFlash(0)
      setShowServerCube(false)
      setShowConnectionLine(false)
      setHideSourceSegments(false)

      // Reset Phase 5 state
      setShowBufferGrid(false)
      setSlotStates([false, false, false, false])
      setIsScanning(false)
      setShowMergedCube(false)
      setMergedScale(0)
      setSuccessMessage('')
      setReceivedSegmentsCount(0)
      setExpectedSequence(1)
      setOutOfOrderAlerts([false, false, false, false])
      setReassemblyProgress(0)
      setIsReassembling(false)
      return
    }

    // Phase 2: Trigger segmentation animation (only if coming from phase 1)
    if (externalPhase === 2 && prevPhase === 1) {
      setSegmentsVisible(false)
      const timeline = gsap.timeline()

      // Step 1: Laser cutting animation completes (0s -> 2.5s)
      timeline.to({ progress: 0 }, {
        progress: 1,
        duration: ANIMATION_CONFIG.laser.duration,
        ease: ANIMATION_CONFIG.laser.ease,
        onUpdate: function() {
          setLaserProgress(this.targets()[0].progress)
        },
      }, 0)

      // Step 2: After laser completes, fade out both laser and cube together (2.5s -> 3.5s)
      timeline.to({ laserOp: 1, cubeOp: 1 }, {
        laserOp: 0,
        cubeOp: 0,
        duration: ANIMATION_CONFIG.fadeOut.duration,
        ease: ANIMATION_CONFIG.fadeOut.ease,
        onUpdate: function() {
          setLaserOpacity(this.targets()[0].laserOp)
          setCubeOpacity(this.targets()[0].cubeOp)
        },
      }, ANIMATION_CONFIG.fadeOut.delay)

      // Step 3: After fade completes, show segments and they slide out (at 3.5s)
      timeline.add(() => setSegmentsVisible(true), ANIMATION_CONFIG.segmentsAppear)
    }

    // Phase 3: Headers are shown via prop, no animation needed here

    // Phase 4: Transmission and reassembly with sequential animations
    if (externalPhase === 4 && (prevPhase === 3 || outOfOrder)) {
      // Reset Phase 4 state
      setTravelingSegments([])
      setSegmentsArrived(0)
      setShowReassembled(false)
      setSuccessFlash(0)
      setShowServerCube(false)
      setShowConnectionLine(false)
      setHideSourceSegments(false)

      // Reset Phase 5 state
      setShowBufferGrid(false)
      setSlotStates([false, false, false, false])
      setWaitingStates([false, false, false, false])
      setIsScanning(false)
      setShowMergedCube(false)
      setMergedScale(0)
      setSuccessMessage('')
      setReceivedSegmentsCount(0)

      // Small delay to ensure state is reset before starting animations
      setTimeout(() => {
        if (outOfOrder) {
          // Phase 5: Out-of-order mode with buffer grid
          setExpectedSequence(1) // Reset to looking for sequence 1
          setOutOfOrderAlerts([false, false, false, false])
          setReassemblyProgress(0)
          setIsReassembling(false)
          setShowBufferGrid(true)

          setTimeout(() => {
            setShowConnectionLine(true)
          }, 600)

          setTimeout(() => {
            setHideSourceSegments(true)
            // Arrival sequence: 1-3-2-4
            // Dispatch them in order that creates [1,3,2,4] arrival pattern
            const segments = [
              { id: 0, startPosition: SEGMENT_POSITIONS[0], color: SEGMENT_COLORS[0], arrivalSlot: 0, dispatchOrder: 0 }, // Seq 1 -> arrives 1st
              { id: 2, startPosition: SEGMENT_POSITIONS[2], color: SEGMENT_COLORS[2], arrivalSlot: 2, dispatchOrder: 1 }, // Seq 3 -> arrives 2nd  
              { id: 1, startPosition: SEGMENT_POSITIONS[1], color: SEGMENT_COLORS[1], arrivalSlot: 1, dispatchOrder: 2 }, // Seq 2 -> arrives 3rd
              { id: 3, startPosition: SEGMENT_POSITIONS[3], color: SEGMENT_COLORS[3], arrivalSlot: 3, dispatchOrder: 3 }, // Seq 4 -> arrives 4th
            ]
            setTravelingSegments(segments)
          }, 1200)
        } else {
          // Normal mode: traditional in-order transmission
          // Step 1: Show server cube (immediately)
          setShowServerCube(true)

          // Step 2: Show connection line (0.6s after server)
          setTimeout(() => {
            setShowConnectionLine(true)
          }, 600)

          // Step 3: Hide source segments and start transmission (1.2s after server)
          setTimeout(() => {
            setHideSourceSegments(true)
            
            // Start sending segments one by one
            const segments = SEGMENT_POSITIONS.map((pos, i) => ({
              id: i,
              startPosition: pos,
              color: SEGMENT_COLORS[i],
            }))
            setTravelingSegments(segments)
          }, 1200)
        }
      }, 50)
    }
  }, [externalPhase, outOfOrder])

  // Handle segment arrival at server (Phase 4 - Normal mode)
  const handleSegmentReachServer = () => {
    setSegmentsArrived(prev => {
      const newCount = prev + 1
      
      // If all segments arrived, trigger reassembly
      if (newCount === 4) {
        setTimeout(() => {
          setTravelingSegments([])
          setShowReassembled(true)
          
          // Trigger success flash after reassembly
          setTimeout(() => {
            setSuccessFlash(prev => prev + 1)
          }, ANIMATION_CONFIG.reassembly.scaleDelay * 1000)
        }, 300)
      }
      
      return newCount
    })
  }

  // Handle segment arrival at buffer (Phase 5 - Out-of-order mode)
  const handleSegmentArrivedAtBuffer = (segmentId, slotIndex) => {
    const sequenceNumber = segmentId + 1 // Convert 0-based id to 1-based sequence
    const expectedBeforeArrival = expectedSequence
    
    // Fill the slot
    setSlotStates(prev => {
      const newStates = [...prev]
      newStates[slotIndex] = true

      const nextMissingIndex = newStates.findIndex(filled => !filled)
      setExpectedSequence(nextMissingIndex === -1 ? 5 : nextMissingIndex + 1)

      // Update waiting states: a slot is waiting if there's a filled slot ahead of it
      const newWaiting = [false, false, false, false]
      for (let i = 0; i < newStates.length; i++) {
        if (!newStates[i]) {
          // Check if any later slot is filled
          const hasFilledLater = newStates.slice(i + 1).some(filled => filled)
          newWaiting[i] = hasFilledLater
        }
      }
      setWaitingStates(newWaiting)

      return newStates
    })

    // Check if this packet is out-of-order
    const isOutOfOrder = sequenceNumber !== expectedBeforeArrival
    
    if (isOutOfOrder) {
      // Show visual alert for out-of-order packet
      setOutOfOrderAlerts(prev => {
        const newAlerts = [...prev]
        newAlerts[slotIndex] = true
        return newAlerts
      })
      
      // Clear alert after 1 second
      setTimeout(() => {
        setOutOfOrderAlerts(prev => {
          const newAlerts = [...prev]
          newAlerts[slotIndex] = false
          return newAlerts
        })
      }, 1000)
    }

    // Track received count
    setReceivedSegmentsCount(prev => {
      const newCount = prev + 1
      
      // Check if all 4 slots are filled
      if (newCount === 4) {
        // Clear traveling segments immediately
        setTravelingSegments([])
        
        setTimeout(() => {
          // All segments received - now we can reorder
          // Animation stage 1: Highlight reordering (500ms)
          setIsScanning(true)
          
          setTimeout(() => {
            // Animation stage 2: Start reassembly by pulling packets in order (1,2,3,4)
            setIsReassembling(true)
            
            // Animate reassembly progress: 0 -> 1 -> 2 -> 3 -> 4
            const reassemblyTimeline = gsap.timeline()
            
            reassemblyTimeline.to({ progress: 0 }, {
              progress: 4,
              duration: 2.0, // 500ms per packet
              ease: 'steps(4, end)',
              onUpdate: function() {
                setReassemblyProgress(Math.round(this.targets()[0].progress))
              },
            })
            
            // Show "correct order" indicator
            setTimeout(() => {
              setIsScanning(false)
            }, 800)
            
            // After all packets reassembled, show result
            setTimeout(() => {
              setIsReassembling(false)
              setShowMergedCube(true)
              
              gsap.to({ scale: 0 }, {
                scale: 1,
                duration: 0.8,
                ease: 'back.out(1.7)',
                onUpdate: function() {
                  setMergedScale(this.targets()[0].scale)
                },
              })
              
              // Show success message after merge animation
              setTimeout(() => {
                setSuccessMessage('✓ TCP Reordering Complete: Arrival [1,3,2,4] → Correct Order [1,2,3,4] | Data Integrity Restored')
              }, 800)
            }, 2000)
          }, 500)
        }, 300)
      }
      
      return newCount
    })
  }

  // Render phases
  const showDataBlock = externalPhase === 1 || cubeOpacity > 0
  const showLaser = externalPhase === 2 && laserOpacity > 0
  const showSegments = externalPhase === 3 || (externalPhase === 4 && !hideSourceSegments) || (externalPhase < 3 && segmentsVisible)
  const showHeaders = externalPhase === 3

  return (
    <group>
      {/* Phase 1: Data Block */}
      {showDataBlock && <DataBlock opacity={cubeOpacity} />}

      {/* Phase 2: Laser Animation */}
      {showLaser && <LaserLine isActive={true} progress={laserProgress} opacity={laserOpacity} />}

      {/* Phase 2-3: Segments at source */}
      {showSegments && SEGMENT_POSITIONS.map((pos, i) => (
        <Segment
          key={`segment-${segmentKey}-${i}`}
          index={i}
          position={pos}
          color={SEGMENT_COLORS[i]}
          showHeader={showHeaders}
        />
      ))}

      {/* Phase 2-3: Flow connectors */}
      {showSegments && SEGMENT_POSITIONS.map((pos, i) => (
        <FlowConnector
          key={`connector-${segmentKey}-${i}`}
          segmentPosition={pos}
          color={SEGMENT_COLORS[i]}
          index={i}
        />
      ))}

      {/* Phase 4: Connection line */}
      {showConnectionLine && <ConnectionLine visible={true} />}

      {/* Phase 4: Server cube (Normal mode) */}
      {showServerCube && !outOfOrder && (
        <ServerCube 
          visible={true} 
          showReassembled={showReassembled}
          successFlash={successFlash}
        />
      )}

      {/* Phase 5: Buffer Grid (Out-of-order mode) */}
      {showBufferGrid && outOfOrder && (
        <BufferGrid 
          slotStates={slotStates}
          waitingStates={waitingStates}
          isScanning={isScanning}
          showMerged={showMergedCube}
          mergedScale={mergedScale}
          outOfOrderAlerts={outOfOrderAlerts}
          isReassembling={isReassembling}
          reassemblyProgress={reassemblyProgress}
          expectedSequence={expectedSequence}
          receivedSegmentsCount={receivedSegmentsCount}
        />
      )}

      {/* Phase 4: Traveling segments */}
      {travelingSegments.map((segment, arrayIndex) => (
        <TravelingSegment
          key={`traveling-${segment.id}`}
          segmentId={segment.id}
          dispatchOrder={outOfOrder ? segment.dispatchOrder : arrayIndex}
          startPosition={segment.startPosition}
          color={segment.color}
          arrivalSlot={outOfOrder ? segment.arrivalSlot : undefined}
          onReachServer={outOfOrder ? handleSegmentArrivedAtBuffer : handleSegmentReachServer}
        />
      ))}

      {/* Success Message (Out-of-order mode) */}
      {successMessage && outOfOrder && (
        <Html distanceFactor={1.2} position={[0, -2.5, 0]}>
          <div className="text-center px-6 py-3 rounded-xl bg-gradient-to-r from-green-900/95 to-emerald-900/95 border-2 border-green-400/90 max-w-2xl shadow-2xl">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl">✓</span>
              <span className="text-green-300 font-black text-xs uppercase tracking-wider">Reordering Complete</span>
            </div>
            <p className="text-green-200 font-semibold text-sm leading-relaxed">{successMessage}</p>
          </div>
        </Html>
      )}
    </group>
  )
}

