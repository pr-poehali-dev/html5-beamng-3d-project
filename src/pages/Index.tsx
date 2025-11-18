import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import Icon from '@/components/ui/icon';

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Vehicle {
  position: Vector3;
  velocity: Vector3;
  rotation: number;
  mass: number;
  damage: number;
}

interface Obstacle {
  position: Vector3;
  size: Vector3;
  type: 'wall' | 'ramp' | 'barrier';
  color: string;
}

export default function Index() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vehicleRef = useRef<Vehicle>({
    position: { x: 0, y: 1, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    rotation: 0,
    mass: 1500,
    damage: 0,
  });
  const [speed, setSpeed] = useState(0);
  const [damage, setDamage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [gravity, setGravity] = useState([9.8]);
  const [enginePower, setEnginePower] = useState([100]);
  const [cameraDistance, setCameraDistance] = useState(25);
  const [cameraHeight, setCameraHeight] = useState(12);
  const [cameraAngleOffset, setCameraAngleOffset] = useState(0);
  const keysPressed = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number>();

  const obstacles: Obstacle[] = [
    { position: { x: 30, y: 0, z: 0 }, size: { x: 2, y: 5, z: 40 }, type: 'wall', color: '#8B5CF6' },
    { position: { x: -30, y: 0, z: 0 }, size: { x: 2, y: 5, z: 40 }, type: 'wall', color: '#8B5CF6' },
    { position: { x: 0, y: 0, z: -40 }, size: { x: 40, y: 5, z: 2 }, type: 'wall', color: '#8B5CF6' },
    { position: { x: 0, y: 0, z: 40 }, size: { x: 40, y: 5, z: 2 }, type: 'wall', color: '#8B5CF6' },
    { position: { x: 10, y: 0, z: 10 }, size: { x: 4, y: 3, z: 4 }, type: 'barrier', color: '#EF4444' },
    { position: { x: -15, y: 0, z: 5 }, size: { x: 8, y: 1.5, z: 6 }, type: 'ramp', color: '#F97316' },
    { position: { x: -10, y: 0, z: -10 }, size: { x: 3, y: 4, z: 3 }, type: 'barrier', color: '#10B981' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current.add(key);
      
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'q', 'e', 'r', 'f'].includes(key)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const checkCollision = (pos: Vector3, size: Vector3, obstacle: Obstacle): boolean => {
      return (
        Math.abs(pos.x - obstacle.position.x) < (size.x + obstacle.size.x) / 2 &&
        Math.abs(pos.z - obstacle.position.z) < (size.z + obstacle.size.z) / 2 &&
        pos.y <= obstacle.size.y
      );
    };

    const project3D = (x: number, y: number, z: number, camX: number, camZ: number, camAngle: number, camHeight: number) => {
      const dx = x - camX;
      const dz = z - camZ;
      const dy = y - camHeight;
      
      const rotatedX = dx * Math.cos(camAngle) - dz * Math.sin(camAngle);
      const rotatedZ = dx * Math.sin(camAngle) + dz * Math.cos(camAngle);
      
      const distance = Math.max(5, rotatedZ + 300);
      const perspective = 400 / distance;
      const screenX = canvas.width / 2 + rotatedX * perspective * 20;
      const screenY = canvas.height * 0.65 - dy * perspective * 20;
      
      return { screenX, screenY, perspective, distance: rotatedZ };
    };

    const drawBox3D = (pos: Vector3, size: Vector3, color: string, camX: number, camZ: number, camAngle: number, camHeight: number) => {
      const vertices = [
        { x: pos.x - size.x/2, y: pos.y, z: pos.z - size.z/2 },
        { x: pos.x + size.x/2, y: pos.y, z: pos.z - size.z/2 },
        { x: pos.x + size.x/2, y: pos.y, z: pos.z + size.z/2 },
        { x: pos.x - size.x/2, y: pos.y, z: pos.z + size.z/2 },
        { x: pos.x - size.x/2, y: pos.y + size.y, z: pos.z - size.z/2 },
        { x: pos.x + size.x/2, y: pos.y + size.y, z: pos.z - size.z/2 },
        { x: pos.x + size.x/2, y: pos.y + size.y, z: pos.z + size.z/2 },
        { x: pos.x - size.x/2, y: pos.y + size.y, z: pos.z + size.z/2 },
      ];

      const projected = vertices.map(v => project3D(v.x, v.y, v.z, camX, camZ, camAngle, camHeight));

      const faces = [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
        [0, 1, 5, 4],
        [2, 3, 7, 6],
        [0, 3, 7, 4],
        [1, 2, 6, 5],
      ];

      const faceColors = [
        color,
        adjustBrightness(color, 1.2),
        adjustBrightness(color, 0.8),
        adjustBrightness(color, 0.8),
        adjustBrightness(color, 0.6),
        adjustBrightness(color, 0.9),
      ];

      faces.forEach((face, idx) => {
        if (projected.every(p => p.distance > -100)) {
          ctx.fillStyle = faceColors[idx];
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(projected[face[0]].screenX, projected[face[0]].screenY);
          for (let i = 1; i < face.length; i++) {
            ctx.lineTo(projected[face[i]].screenX, projected[face[i]].screenY);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      });
    };

    const adjustBrightness = (color: string, factor: number) => {
      const hex = color.replace('#', '');
      const r = Math.min(255, Math.floor(parseInt(hex.substr(0, 2), 16) * factor));
      const g = Math.min(255, Math.floor(parseInt(hex.substr(2, 2), 16) * factor));
      const b = Math.min(255, Math.floor(parseInt(hex.substr(4, 2), 16) * factor));
      return `rgb(${r},${g},${b})`;
    };

    const gameLoop = () => {
      if (!isPaused) {
        const vehicle = vehicleRef.current;
        const dt = 1 / 60;
        const powerFactor = enginePower[0] / 100;

        if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) {
          vehicle.velocity.x -= Math.sin(vehicle.rotation) * 1.2 * powerFactor;
          vehicle.velocity.z -= Math.cos(vehicle.rotation) * 1.2 * powerFactor;
        }
        if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) {
          vehicle.velocity.x += Math.sin(vehicle.rotation) * 0.7 * powerFactor;
          vehicle.velocity.z += Math.cos(vehicle.rotation) * 0.7 * powerFactor;
        }
        if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) {
          const speedFactor = Math.sqrt(vehicle.velocity.x ** 2 + vehicle.velocity.z ** 2);
          if (speedFactor > 0.1) {
            vehicle.rotation += 0.04;
          }
        }
        if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) {
          const speedFactor = Math.sqrt(vehicle.velocity.x ** 2 + vehicle.velocity.z ** 2);
          if (speedFactor > 0.1) {
            vehicle.rotation -= 0.04;
          }
        }

        if (keysPressed.current.has('q')) {
          setCameraAngleOffset(prev => prev + 0.03);
        }
        if (keysPressed.current.has('e')) {
          setCameraAngleOffset(prev => prev - 0.03);
        }
        if (keysPressed.current.has('r')) {
          setCameraDistance(prev => Math.max(10, prev - 0.5));
        }
        if (keysPressed.current.has('f')) {
          setCameraDistance(prev => Math.min(50, prev + 0.5));
        }

        vehicle.velocity.x *= 0.98;
        vehicle.velocity.z *= 0.98;
        vehicle.velocity.y -= gravity[0] * dt;

        vehicle.position.x += vehicle.velocity.x * dt;
        vehicle.position.z += vehicle.velocity.z * dt;
        vehicle.position.y += vehicle.velocity.y * dt;

        if (vehicle.position.y < 1) {
          vehicle.position.y = 1;
          if (vehicle.velocity.y < -5) {
            vehicle.damage += Math.abs(vehicle.velocity.y) * 2;
          }
          vehicle.velocity.y = 0;
        }

        const vehicleSize = { x: 2, y: 1.5, z: 4 };
        obstacles.forEach((obstacle) => {
          if (checkCollision(vehicle.position, vehicleSize, obstacle)) {
            const collisionSpeed = Math.sqrt(
              vehicle.velocity.x ** 2 + vehicle.velocity.z ** 2
            );
            if (collisionSpeed > 3) {
              vehicle.damage += collisionSpeed * 5;
            }

            const dx = vehicle.position.x - obstacle.position.x;
            const dz = vehicle.position.z - obstacle.position.z;
            const distance = Math.sqrt(dx ** 2 + dz ** 2);
            if (distance > 0.1) {
              vehicle.position.x = obstacle.position.x + (dx / distance) * ((vehicleSize.x + obstacle.size.x) / 2 + 0.1);
              vehicle.position.z = obstacle.position.z + (dz / distance) * ((vehicleSize.z + obstacle.size.z) / 2 + 0.1);
            }

            vehicle.velocity.x *= -0.5;
            vehicle.velocity.z *= -0.5;
          }
        });

        if (vehicle.damage > 100) vehicle.damage = 100;

        const currentSpeed = Math.sqrt(vehicle.velocity.x ** 2 + vehicle.velocity.z ** 2) * 20;
        setSpeed(currentSpeed);
        setDamage(vehicle.damage);
      }

      const vehicle = vehicleRef.current;
      const totalAngle = vehicle.rotation + cameraAngleOffset;
      const camX = vehicle.position.x + Math.sin(totalAngle) * cameraDistance;
      const camZ = vehicle.position.z + Math.cos(totalAngle) * cameraDistance;

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0A1128');
      gradient.addColorStop(1, '#1A2F4F');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#1e3a5f';
      for (let z = -50; z <= 50; z += 5) {
        for (let x = -50; x <= 50; x += 5) {
          const p1 = project3D(x, 0, z, camX, camZ, totalAngle, cameraHeight);
          const p2 = project3D(x + 5, 0, z, camX, camZ, totalAngle, cameraHeight);
          const p3 = project3D(x + 5, 0, z + 5, camX, camZ, totalAngle, cameraHeight);
          const p4 = project3D(x, 0, z + 5, camX, camZ, totalAngle, cameraHeight);
          
          if (p1.distance > 0 && p2.distance > 0) {
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = '#0EA5E9';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p1.screenX, p1.screenY);
            ctx.lineTo(p2.screenX, p2.screenY);
            ctx.lineTo(p3.screenX, p3.screenY);
            ctx.lineTo(p4.screenX, p4.screenY);
            ctx.closePath();
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      obstacles.forEach((obstacle) => {
        drawBox3D(obstacle.position, obstacle.size, obstacle.color, camX, camZ, totalAngle, cameraHeight);
      });

      const damageColor = vehicle.damage > 50 ? '#EF4444' : '#0EA5E9';
      drawBox3D(vehicle.position, { x: 2, y: 1.5, z: 4 }, damageColor, camX, camZ, totalAngle, cameraHeight);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isPaused, gravity, enginePower, cameraDistance, cameraHeight, cameraAngleOffset]);

  const resetVehicle = () => {
    vehicleRef.current = {
      position: { x: 0, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: 0,
      mass: 1500,
      damage: 0,
    };
    setSpeed(0);
    setDamage(0);
    setCameraDistance(25);
    setCameraHeight(12);
    setCameraAngleOffset(0);
  };

  return (
    <div className="relative w-full h-screen bg-[#1A1F2C] overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        tabIndex={0}
      />

      <div className="absolute top-6 left-6 space-y-4 pointer-events-auto">
        <Card className="bg-black/70 backdrop-blur-md border-[#0EA5E9]/40 p-4 min-w-[200px]">
          <div className="space-y-2 text-white">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">СКОРОСТЬ</span>
              <span className="text-2xl font-bold text-[#0EA5E9] font-mono">{speed.toFixed(0)} км/ч</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">УРОН</span>
              <span className={`text-2xl font-bold font-mono ${damage > 50 ? 'text-[#EF4444]' : 'text-[#0EA5E9]'}`}>
                {damage.toFixed(0)}%
              </span>
            </div>
          </div>
        </Card>

        <Card className="bg-black/70 backdrop-blur-md border-[#0EA5E9]/40 p-3">
          <div className="text-white text-sm space-y-1">
            <div className="text-gray-400 mb-2 font-semibold">МАШИНА</div>
            <div className="flex items-center gap-2">
              <span className="text-[#0EA5E9]">W/↑</span> <span className="text-gray-300">Газ</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#0EA5E9]">S/↓</span> <span className="text-gray-300">Тормоз</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#0EA5E9]">A/←</span> <span className="text-gray-300">Влево</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#0EA5E9]">D/→</span> <span className="text-gray-300">Вправо</span>
            </div>
          </div>
        </Card>

        <Card className="bg-black/70 backdrop-blur-md border-[#F97316]/40 p-3">
          <div className="text-white text-sm space-y-1">
            <div className="text-gray-400 mb-2 font-semibold">КАМЕРА</div>
            <div className="flex items-center gap-2">
              <span className="text-[#F97316]">Q/E</span> <span className="text-gray-300">Вращать</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#F97316]">R/F</span> <span className="text-gray-300">Зум</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="absolute top-6 right-6 space-y-3 pointer-events-auto">
        <Button
          onClick={() => setIsPaused(!isPaused)}
          className="w-full bg-[#0EA5E9] hover:bg-[#0EA5E9]/80 text-white shadow-lg"
        >
          <Icon name={isPaused ? 'Play' : 'Pause'} size={20} className="mr-2" />
          {isPaused ? 'Продолжить' : 'Пауза'}
        </Button>

        <Button
          onClick={resetVehicle}
          className="w-full bg-[#F97316] hover:bg-[#F97316]/80 text-white shadow-lg"
        >
          <Icon name="RotateCcw" size={20} className="mr-2" />
          Сброс
        </Button>

        <Button
          onClick={() => setShowSettings(!showSettings)}
          variant="outline"
          className="w-full bg-black/70 backdrop-blur-md border-[#0EA5E9]/40 text-white hover:bg-white/10 shadow-lg"
        >
          <Icon name="Settings" size={20} className="mr-2" />
          Настройки
        </Button>
      </div>

      {showSettings && (
        <Card className="absolute bottom-6 right-6 bg-black/80 backdrop-blur-md border-[#0EA5E9]/40 p-6 w-80 shadow-2xl pointer-events-auto">
          <div className="space-y-5 text-white">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Гравитация</span>
                <span className="text-sm text-[#0EA5E9] font-mono">{gravity[0].toFixed(1)} м/с²</span>
              </div>
              <Slider
                value={gravity}
                onValueChange={setGravity}
                min={0}
                max={20}
                step={0.1}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Мощность двигателя</span>
                <span className="text-sm text-[#0EA5E9] font-mono">{enginePower[0]}%</span>
              </div>
              <Slider
                value={enginePower}
                onValueChange={setEnginePower}
                min={0}
                max={200}
                step={10}
                className="w-full"
              />
            </div>

            <div className="pt-2 border-t border-white/10">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Расстояние камеры</span>
                <span className="text-sm text-[#F97316] font-mono">{cameraDistance.toFixed(0)}м</span>
              </div>
              <Slider
                value={[cameraDistance]}
                onValueChange={(val) => setCameraDistance(val[0])}
                min={10}
                max={50}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Высота камеры</span>
                <span className="text-sm text-[#F97316] font-mono">{cameraHeight.toFixed(0)}м</span>
              </div>
              <Slider
                value={[cameraHeight]}
                onValueChange={(val) => setCameraHeight(val[0])}
                min={5}
                max={30}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </Card>
      )}

      <div className="absolute bottom-6 left-6 pointer-events-auto">
        <Card className="bg-black/70 backdrop-blur-md border-[#0EA5E9]/40 p-4 shadow-xl">
          <h1 className="text-2xl font-bold text-white mb-1 tracking-wider">BEAMNG SIMULATOR</h1>
          <p className="text-sm text-gray-400">Краш-тест драйв v3.0</p>
        </Card>
      </div>
    </div>
  );
}
