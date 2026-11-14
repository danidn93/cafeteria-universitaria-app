import { useMemo } from 'react';
import './ChristmasSnow.css';

type Snowflake = {
  left: string;
  delay: string;
  duration: string;
  size: string;
  opacity: number;
  drift: string;
};

export default function ChristmasSnow() {
  const flakes = useMemo<Snowflake[]>(() =>
    Array.from({ length: 35 }, (_, i) => ({
      left: `${(i * 37.618) % 100}%`,
      delay: `-${(i * 2.71) % 16}s`,
      duration: `${9 + (i % 8) * 1.6}s`,
      size: `${3 + (i % 4) * 1.5}px`,
      opacity: 0.35 + (i % 5) * 0.12,
      drift: `${(i % 2 ? 1 : -1) * (20 + (i % 6) * 9)}px`,
    })),
  []);

  return (
    <div className="christmas-snow" aria-hidden="true">
      {flakes.map((flake, index) => (
        <span
          key={index}
          className="christmas-snow__flake"
          style={{
            left: flake.left,
            width: flake.size,
            height: flake.size,
            opacity: flake.opacity,
            animationDelay: flake.delay,
            animationDuration: flake.duration,
            '--snow-drift': flake.drift,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
