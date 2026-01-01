const Logo = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 120"
      role="img"
      aria-label="Clean My Kicks"
      className={className}
    >
      <g fill="currentColor">
        {/* CLEAN MY */}
        <text
          x="0"
          y="85"
          fontSize="72"
          fontWeight="700"
          fontFamily="Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
          letterSpacing="-0.02em"
        >
          CLEAN MY
        </text>

        {/* K */}
        <text
          x="280"
          y="85"
          fontSize="72"
          fontWeight="700"
          fontFamily="Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
          letterSpacing="-0.02em"
        >
          K
        </text>

        {/* Shoelaces integrated into the K */}
        <g stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round">
          {/* lace top */}
          <path d="M320 20 C340 40, 360 55, 380 70" />
          {/* lace bottom */}
          <path d="M320 90 C340 70, 360 55, 380 40" />
        </g>

        {/* ICKS */}
        <text
          x="390"
          y="85"
          fontSize="72"
          fontWeight="700"
          fontFamily="Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
          letterSpacing="-0.02em"
        >
          ICKS
        </text>
      </g>
    </svg>
  );
};

export default Logo;
