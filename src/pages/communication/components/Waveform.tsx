import React from 'react';

interface WaveformProps {
  active: boolean;
  heightClass?: string;
  barWidthClass?: string;
  gradient?: boolean;
  color?: string;
}

export const Waveform: React.FC<WaveformProps> = ({
  active,
  heightClass = 'h-8',
  barWidthClass = 'w-1',
  gradient = false,
  color = '#ef4444'
}) => {
  const bars = [0.3, 0.7, 0.5, 0.9, 0.6, 0.8, 0.4, 0.7, 0.5, 0.3, 0.6, 0.8, 0.4];
  
  const getBackground = () => {
    if (gradient) {
      return 'linear-gradient(to top, #6366f1, #a855f7)';
    }
    return color;
  };

  return (
    <div className={`flex items-center gap-0.5 justify-center ${heightClass}`}>
      {bars.map((h, i) => (
        <div
          key={i}
          className={`${barWidthClass} rounded-full`}
          style={{
            background: getBackground(),
            opacity: active ? 1 : 0.2,
            transform: active ? `scaleY(${h})` : 'scaleY(0.2)',
            height: '100%',
            animation: active ? `wave-bar ${0.4 + i * 0.05}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 40}ms`
          }}
        />
      ))}
    </div>
  );
};
