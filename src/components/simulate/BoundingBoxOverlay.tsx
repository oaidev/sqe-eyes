import { useMemo } from 'react';

interface BoundingBox {
  Left: number;
  Top: number;
  Width: number;
  Height: number;
}

interface PersonBox {
  boundingBox: BoundingBox | null;
  workerName: string | null;
  hasViolation: boolean;
  ppeStatus: string;
  personIndex: number;
}

interface BoundingBoxOverlayProps {
  imageSrc: string;
  persons: PersonBox[];
}

export function BoundingBoxOverlay({ imageSrc, persons }: BoundingBoxOverlayProps) {
  const boxes = useMemo(() => persons.filter(p => p.boundingBox), [persons]);

  return (
    <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
      <img src={imageSrc} alt="Captured frame" className="w-full h-full object-contain" />
      {/* SVG overlay for bounding boxes */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        style={{ pointerEvents: 'none' }}
      >
        {boxes.map((person, i) => {
          const bb = person.boundingBox!;
          const color = person.hasViolation ? '#ef4444' : '#22c55e';
          return (
            <g key={i}>
              <rect
                x={bb.Left}
                y={bb.Top}
                width={bb.Width}
                height={bb.Height}
                fill="none"
                stroke={color}
                strokeWidth="0.003"
                rx="0.002"
              />
              {/* Label background */}
              <rect
                x={bb.Left}
                y={Math.max(0, bb.Top - 0.035)}
                width={Math.min(bb.Width + 0.05, 1 - bb.Left)}
                height="0.032"
                fill={color}
                rx="0.002"
              />
            </g>
          );
        })}
      </svg>
      {/* HTML labels for better text rendering */}
      {boxes.map((person, i) => {
        const bb = person.boundingBox!;
        const colorClass = person.hasViolation ? 'bg-red-500' : 'bg-green-500';
        const label = `#${person.personIndex} ${person.workerName || 'Tidak Dikenal'}`;
        return (
          <div
            key={i}
            className={`absolute ${colorClass} text-white text-[9px] leading-tight px-1 py-0.5 rounded-sm font-medium truncate`}
            style={{
              left: `${bb.Left * 100}%`,
              top: `${Math.max(0, bb.Top - 0.04) * 100}%`,
              maxWidth: `${Math.max(bb.Width * 100, 15)}%`,
            }}
          >
            {label}
            {person.ppeStatus && (
              <span className="block text-[8px] font-normal opacity-90">{person.ppeStatus}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
