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
}

export default function Index() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [vehicle, setVehicle] = useState<Vehicle>({
    position: { x: 0, y: 1, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    rotation: 0,
    mass: 1500,
    damage: 0,
  });
  const [speed, setSpeed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [gravity, setGravity] = useState([9.8]);
  const [enginePower, setEnginePower] = useState([100]);
  const keysPressed = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number>();
  const cameraAngle = useRef(0);

  const obstacles: Obstacle[] = [
    { position: { x: 30, y: 0, z: 0 }, size: { x: 2, y: 5, z: 20 }, type: 'wall' },
    { position: { x: -30, y: 0, z: 0 }, size: { x: 2, y: 5, z: 20 }, type: 'wall' },
    { position: { x: 0, y: 0, z: -30 }, size: { x: 20, y: 5, z: 2 }, type: 'wall' },
    { position: { x: 10, y: 0, z: 10 }, size: { x: 4, y: 3, z: 4 }, type: 'barrier' },
    { position: { x: -15, y: 0, z: 5 }, size: { x: 8, y: 2, z: 6 }, type: 'ramp' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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
        pos.y < obstacle.size.y
      );
    };

    const gameLoop = () => {
      if (isPaused) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      setVehicle((prev) => {
        const newVehicle = { ...prev };
        const dt = 1 / 60;
        const powerFactor = enginePower[0] / 100;

        if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) {
          newVehicle.velocity.x += Math.sin(newVehicle.rotation) * 0.5 * powerFactor;
          newVehicle.velocity.z += Math.cos(newVehicle.rotation) * 0.5 * powerFactor;
        }
        if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) {
          newVehicle.velocity.x -= Math.sin(newVehicle.rotation) * 0.3 * powerFactor;
          newVehicle.velocity.z -= Math.cos(newVehicle.rotation) * 0.3 * powerFactor;
        }
        if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) {
          newVehicle.rotation += 0.05;
          cameraAngle.current += 0.05;
        }
        if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) {
          newVehicle.rotation -= 0.05;
          cameraAngle.current -= 0.05;
        }

        newVehicle.velocity.x *= 0.98;
        newVehicle.velocity.z *= 0.98;
        newVehicle.velocity.y -= gravity[0] * dt;

        newVehicle.position.x += newVehicle.velocity.x * dt;
        newVehicle.position.z += newVehicle.velocity.z * dt;
        newVehicle.position.y += newVehicle.velocity.y * dt;

        if (newVehicle.position.y < 1) {
          newVehicle.position.y = 1;
          if (newVehicle.velocity.y < -5) {
            newVehicle.damage += Math.abs(newVehicle.velocity.y) * 2;
          }
          newVehicle.velocity.y = 0;
        }

        const vehicleSize = { x: 2, y: 1.5, z: 4 };
        obstacles.forEach((obstacle) => {
          if (checkCollision(newVehicle.position, vehicleSize, obstacle)) {
            const collisionSpeed = Math.sqrt(
              newVehicle.velocity.x ** 2 + newVehicle.velocity.z ** 2
            );
            if (collisionSpeed > 3) {
              newVehicle.damage += collisionSpeed * 5;
            }

            const dx = newVehicle.position.x - obstacle.position.x;
            const dz = newVehicle.position.z - obstacle.position.z;
            const distance = Math.sqrt(dx ** 2 + dz ** 2);
            if (distance > 0) {
              newVehicle.position.x = obstacle.position.x + (dx / distance) * ((vehicleSize.x + obstacle.size.x) / 2);
              newVehicle.position.z = obstacle.position.z + (dz / distance) * ((vehicleSize.z + obstacle.size.z) / 2);
            }

            newVehicle.velocity.x *= -0.5;
            newVehicle.velocity.z *= -0.5;
          }
        });

        if (newVehicle.damage > 100) newVehicle.damage = 100;

        return newVehicle;
      });

      const currentSpeed = Math.sqrt(vehicle.velocity.x ** 2 + vehicle.velocity.z ** 2) * 20;
      setSpeed(currentSpeed);

      ctx.fillStyle = '#1A1F2C';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scale = 10;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      const drawBox = (pos: Vector3, size: Vector3, color: string, rot: number = 0) => {
        const screenX = centerX + (pos.x - vehicle.position.x) * scale;
        const screenY = centerY + (pos.z - vehicle.position.z) * scale - pos.y * scale;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(-rot - cameraAngle.current);

        const gradient = ctx.createLinearGradient(-size.x * scale / 2, -size.y * scale / 2, size.x * scale / 2, size.y * scale / 2);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, '#000000');

        ctx.fillStyle = gradient;
        ctx.fillRect(-size.x * scale / 2, -size.z * scale / 2, size.x * scale, size.z * scale);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-size.x * scale / 2, -size.z * scale / 2, size.x * scale, size.z * scale);
        ctx.restore();
      };

      ctx.fillStyle = '#2A3F5F';
      ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

      ctx.strokeStyle = '#0EA5E9';
      ctx.lineWidth = 1;
      for (let i = -50; i <= 50; i += 5) {
        const x1 = centerX + (i - vehicle.position.x) * scale;
        const z1 = centerY + (-50 - vehicle.position.z) * scale;
        const x2 = centerX + (i - vehicle.position.x) * scale;
        const z2 = centerY + (50 - vehicle.position.z) * scale;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.moveTo(x1, z1);
        ctx.lineTo(x2, z2);
        ctx.stroke();
      }

      for (let i = -50; i <= 50; i += 5) {
        const x1 = centerX + (-50 - vehicle.position.x) * scale;
        const z1 = centerY + (i - vehicle.position.z) * scale;
        const x2 = centerX + (50 - vehicle.position.x) * scale;
        const z2 = centerY + (i - vehicle.position.z) * scale;
        ctx.beginPath();
        ctx.moveTo(x1, z1);
        ctx.lineTo(x2, z2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      obstacles.forEach((obstacle) => {
        let color = '#666666';
        if (obstacle.type === 'wall') color = '#8B5CF6';
        if (obstacle.type === 'ramp') color = '#F97316';
        if (obstacle.type === 'barrier') color = '#EF4444';
        drawBox(obstacle.position, obstacle.size, color);
      });

      const damageColor = vehicle.damage > 50 ? '#EF4444' : '#0EA5E9';
      drawBox(vehicle.position, { x: 2, y: 1.5, z: 4 }, damageColor, vehicle.rotation);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [vehicle, isPaused, gravity, enginePower]);

  const resetVehicle = () => {
    setVehicle({
      position: { x: 0, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: 0,
      mass: 1500,
      damage: 0,
    });
    setSpeed(0);
  };

  return (
    <div className="relative w-full h-screen bg-[#1A1F2C] overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: 'crisp-edges' }}
      />

      <div className="absolute top-6 left-6 space-y-4">
        <Card className="bg-black/60 backdrop-blur-sm border-[#0EA5E9]/30 p-4 min-w-[200px]">
          <div className="space-y-2 text-white font-['Orbitron']">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">СКОРОСТЬ</span>
              <span className="text-2xl font-bold text-[#0EA5E9]">{speed.toFixed(0)} км/ч</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">УРОН</span>
              <span className={`text-2xl font-bold ${vehicle.damage > 50 ? 'text-[#EF4444]' : 'text-[#0EA5E9]'}`}>
                {vehicle.damage.toFixed(0)}%
              </span>
            </div>
          </div>
        </Card>

        <Card className="bg-black/60 backdrop-blur-sm border-[#0EA5E9]/30 p-3">
          <div className="text-white text-sm space-y-1">
            <div className="text-gray-400 mb-2">УПРАВЛЕНИЕ</div>
            <div>W/↑ - Газ</div>
            <div>S/↓ - Тормоз</div>
            <div>A/← - Влево</div>
            <div>D/→ - Вправо</div>
          </div>
        </Card>
      </div>

      <div className="absolute top-6 right-6 space-y-3">
        <Button
          onClick={() => setIsPaused(!isPaused)}
          className="w-full bg-[#0EA5E9] hover:bg-[#0EA5E9]/80 text-white"
        >
          <Icon name={isPaused ? 'Play' : 'Pause'} size={20} className="mr-2" />
          {isPaused ? 'Продолжить' : 'Пауза'}
        </Button>

        <Button
          onClick={resetVehicle}
          className="w-full bg-[#F97316] hover:bg-[#F97316]/80 text-white"
        >
          <Icon name="RotateCcw" size={20} className="mr-2" />
          Сброс
        </Button>

        <Button
          onClick={() => setShowSettings(!showSettings)}
          variant="outline"
          className="w-full bg-black/60 backdrop-blur-sm border-[#0EA5E9]/30 text-white hover:bg-white/10"
        >
          <Icon name="Settings" size={20} className="mr-2" />
          Настройки
        </Button>
      </div>

      {showSettings && (
        <Card className="absolute bottom-6 right-6 bg-black/80 backdrop-blur-sm border-[#0EA5E9]/30 p-6 w-80">
          <div className="space-y-4 text-white">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Гравитация</span>
                <span className="text-sm text-[#0EA5E9]">{gravity[0].toFixed(1)} м/с²</span>
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
                <span className="text-sm">Мощность двигателя</span>
                <span className="text-sm text-[#0EA5E9]">{enginePower[0]}%</span>
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
          </div>
        </Card>
      )}

      <div className="absolute bottom-6 left-6">
        <Card className="bg-black/60 backdrop-blur-sm border-[#0EA5E9]/30 p-4">
          <h1 className="text-2xl font-bold text-white mb-1 font-['Orbitron']">BEAMNG SIMULATOR</h1>
          <p className="text-sm text-gray-400">Краш-тест драйв v1.0</p>
        </Card>
      </div>
    </div>
  );
}
