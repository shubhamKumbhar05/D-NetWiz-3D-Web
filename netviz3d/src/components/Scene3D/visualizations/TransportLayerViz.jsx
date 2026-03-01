import React from 'react'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import TCPConnectionViz from './TCPConnectionViz'
import SegmentationStage from './SegmentationStage'

/**
 * Transport Layer Visualization - Per-Concept Models
 * Segmentation | TCP Connection | ACK | Retransmission | Flow Control | TCP vs UDP
 */

// TCP Connection Visualization is now imported from TCPConnectionViz.jsx
// See TCPConnectionViz component for Phase 1-5 implementation details

// ACK Visualization
function ACKViz() {
  const groupRef = useRef()
  const particlesRef = useRef([])
  const timeRef = useRef(0)

  useFrame(() => {
    timeRef.current += 0.016
    if (groupRef.current) groupRef.current.rotation.y += 0.008
    particlesRef.current.forEach((ref, i) => {
      if (ref) {
        ref.position.x = -2 + i * 2 + Math.sin(timeRef.current * 0.005 + i) * 0.5
        ref.position.y = 0.5 + Math.cos(timeRef.current * 0.003 + i) * 0.3
      }
    })
  })

  return (
    <group ref={groupRef}>
      {/* Sender node */}
      <mesh position={[-4, 0, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color="#a855f7" emissive="#7e22ce" emissiveIntensity={0.7} />
      </mesh>
      {/* ACK packets flying */}
      {[0, 1, 2].map((i) => (
        <mesh key={`ack-${i}`} ref={(el) => (particlesRef.current[i] = el)} position={[0, 0, 0]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#d8b4fe" emissive="#a855f7" emissiveIntensity={0.9} />
        </mesh>
      ))}
      {/* Receiver node */}
      <mesh position={[4, 0, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color="#a855f7" emissive="#7e22ce" emissiveIntensity={0.7} />
      </mesh>
    </group>
  )
}

// Retransmission Visualization
function RetransmissionViz() {
  const groupRef = useRef()
  const packetRef = useRef()
  const timeRef = useRef(0)
  useFrame(() => {
    timeRef.current += 0.016
    if (groupRef.current) groupRef.current.rotation.y += 0.002
    if (packetRef.current) {
      packetRef.current.position.x = Math.sin(timeRef.current * 0.002) * 2
    }
  })
  return (
    <group ref={groupRef}>
      {/* Sender */}
      <mesh position={[-3, 1.5, 0]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color="#a855f7" emissive="#7e22ce" emissiveIntensity={0.7} />
      </mesh>
      {/* Receiver */}
      <mesh position={[3, 1.5, 0]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color="#a855f7" emissive="#7e22ce" emissiveIntensity={0.7} />
      </mesh>
      {/* Timeout zone */}
      <mesh position={[0, -1, 0]}>
        <torusGeometry args={[2.5, 0.15, 8, 100]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={0.6}
        />
      </mesh>
      {/* Packet being resent */}
      <mesh ref={packetRef} position={[0, 1.5, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.9} />
      </mesh>
    </group>
  )
}

// Flow Control Visualization
function FlowControlViz() {
  const groupRef = useRef()
  const particlesRef = useRef([])
  const timeRef = useRef(0)
  useFrame(() => {
    timeRef.current += 0.016
    if (groupRef.current) groupRef.current.rotation.z += 0.004
    particlesRef.current.forEach((ref, i) => {
      if (ref) {
        ref.position.y = 0.5 + Math.sin(timeRef.current * 0.003 + i) * 0.4
      }
    })
  })
  return (
    <group ref={groupRef}>
      {/* Sender window */}
      <mesh position={[-4, 0, 0]}>
        <boxGeometry args={[1.5, 3, 1]} />
        <meshStandardMaterial color="#a855f7" emissive="#7e22ce" emissiveIntensity={0.6} />
      </mesh>
      {/* Sliding window */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3, 2.5, 0.8]} />
        <meshStandardMaterial color="#d8b4fe" transparent opacity={0.5} emissive="#a855f7" emissiveIntensity={0.5} />
      </mesh>
      {/* Data packets in transit */}
      {[0, 1].map((i) => (
        <mesh key={`window-${i}`} ref={(el) => (particlesRef.current[i] = el)} position={[-1 + i * 2, 0, 0]}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
        </mesh>
      ))}
      {/* Receiver */}
      <mesh position={[4, 0, 0]}>
        <boxGeometry args={[1.5, 3, 1]} />
        <meshStandardMaterial color="#a855f7" emissive="#7e22ce" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

// TCP vs UDP Visualization
function TCPvsUDPViz() {
  const groupRef = useRef()
  const udpParticlesRef = useRef([])
  const timeRef = useRef(0)
  useFrame(() => {
    timeRef.current += 0.016
    if (groupRef.current) groupRef.current.rotation.y += 0.003
    udpParticlesRef.current.forEach((ref, i) => {
      if (ref) {
        ref.position.x = 3.5 + Math.sin(timeRef.current * 0.005 + i) * 1.5
      }
    })
  })
  return (
    <group ref={groupRef}>
      {/* TCP side - Reliable (complex) */}
      <group position={[-3.5, 0, 0]}>
        <mesh position={[0, 2, 0]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#a855f7" emissive="#7e22ce" emissiveIntensity={0.7} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={`tcp-${i}`} position={[0, 0.5 - i * 1, 0]}>
            <boxGeometry args={[0.6, 0.4, 0.6]} />
            <meshStandardMaterial color="#d8b4fe" emissive="#a855f7" emissiveIntensity={0.8} />
          </mesh>
        ))}
        {/* TCP label ring */}
        <mesh>
          <torusGeometry args={[1.5, 0.1, 8, 100]} />
          <meshStandardMaterial color="#a855f7" emissive="#7e22ce" emissiveIntensity={0.5} />
        </mesh>
      </group>
      {/* UDP side - Fast (simple) */}
      <group position={[3.5, 0, 0]}>
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshStandardMaterial color="#f59e0b" emissive="#ea580c" emissiveIntensity={0.7} />
        </mesh>
        {/* Quick particles */}
        {[0, 1].map((i) => (
          <mesh key={`udp-${i}`} ref={(el) => (udpParticlesRef.current[i] = el)} position={[0, -0.5, 0]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export default function TransportLayerViz({ conceptId = 'trans-segmentation', triggerScenario, triggerClosing, onStateUpdate, segmentPhase, outOfOrder }) {
  switch (conceptId) {
    case 'trans-segmentation':
      return <SegmentationStage externalPhase={segmentPhase} outOfOrder={outOfOrder} />
    case 'trans-tcp-conn':
      return <TCPConnectionViz triggerScenario={triggerScenario} triggerClosing={triggerClosing} onStateUpdate={onStateUpdate} />
    case 'trans-ack':
      return <ACKViz />
    case 'trans-retrans':
      return <RetransmissionViz />
    case 'trans-flow-ctrl':
      return <FlowControlViz />
    case 'trans-tcp-vs-udp':
      return <TCPvsUDPViz />
    default:
      return <SegmentationStage />
  }
}
