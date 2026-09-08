import React from 'react';

interface StreakRingProps {
  size: number;
  strokeWidth: number;
  color: string;
  progress: number; // 0 to 1
  title: string;
  currentStreak: number;
  longestStreak: number;
  onClick: () => void;
}

const StreakRing: React.FC<StreakRingProps> = ({ size, strokeWidth, color, progress, title, currentStreak, longestStreak, onClick }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div 
      onClick={onClick}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        cursor: 'pointer',
        transition: 'transform 0.2s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Background Ring */}
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            stroke={`${color}33`} // 20% opacity for background
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress Ring */}
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        {/* Center Text (Current Streak) */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>🔥{currentStreak}</span>
        </div>
      </div>
      <div style={{ marginTop: '12px', textAlign: 'center' }}>
        <strong style={{ display: 'block', color: '#e5e7eb', fontSize: '14px' }}>{title}</strong>
        <span style={{ color: '#9ca3af', fontSize: '12px' }}>Best: {longestStreak}</span>
      </div>
    </div>
  );
};

export default StreakRing;
