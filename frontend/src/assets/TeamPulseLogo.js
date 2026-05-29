import React from 'react';

const TeamPulseLogo = ({ width = 180, height = 40 }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 360 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="TeamPulse"
    >
      <rect x="2" y="2" width="76" height="76" rx="16" fill="#FACC15" />
      <path
        d="M22 43.5H34.5L39.5 28L45.5 53L50.5 39H59"
        stroke="#323232"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="96"
        y="49"
        fill="#FACC15"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="48"
        fontWeight="700"
      >
        Team Pulse
      </text>
    </svg>
  );
};

export default TeamPulseLogo;
