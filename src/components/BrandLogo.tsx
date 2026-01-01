// src/components/BrandLogo.tsx
type BrandLogoProps = {
  className?: string;
};

export default function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 720 140"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Clean My Kicks"
    >
      {/* Uses currentColor so it automatically matches your website text color */}
      <g fill="currentColor">
        {/* CLEAN MY */}
        <text
          x="0"
          y="95"
          fontSize="72"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial, sans-serif"
          letterSpacing="-0.02em"
        >
          CLEAN MY
        </text>

        {/* K */}
        <text
          x="305"
          y="95"
          fontSize="72"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial, sans-serif"
          letterSpacing="-0.02em"
        >
          K
        </text>

        {/* ICKS */}
        <text
          x="410"
          y="95"
          fontSize="72"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial, sans-serif"
          letterSpacing="-0.02em"
        >
          ICKS
        </text>
      </g>

      {/* LACES IN THE K (stroke uses currentColor too) */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      >
        {/* lace top */}
        <path d="M350 25 C370 45, 390 60, 410 78" />
        {/* lace bottom */}
        <path d="M350 105 C370 85, 390 70, 410 50" />
      </g>
    </svg>
  );
}
