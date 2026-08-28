import React from 'react';
import Svg, { Line } from 'react-native-svg';

export function MenuIcon({ size = 22, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="3.5" y1="6" x2="20.5" y2="6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1="3.5" y1="12" x2="20.5" y2="12" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1="3.5" y1="18" x2="20.5" y2="18" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}
