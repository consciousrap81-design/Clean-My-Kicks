// src/components/BrandLogo.tsx
type BrandLogoProps = {
  className?: string;
};




export default function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <span
      className={[
        "inline-flex items-baseline gap-1 leading-none font-extrabold tracking-tight",
        className,
      ].join(" ")}
      aria-label="Clean My Kicks"
    >
      <span>CLEAN</span>
      <span>MY</span>




      {/* K with laces */}
      <span className="inline-flex items-baseline">
        <svg
          viewBox="0 0 120 140"
          width="0.95em"
          height="1.05em"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-hidden="true"
          style={{ verticalAlign: "-0.08em" }}
        >
          {/* The K */}
          <text
            x="18"
            y="112"
            fontSize="118"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial, sans-serif"
            fill="currentColor"
          >
            K
          </text>




          {/* Shoelaces over the diagonal */}
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
          >
            <path d="M40 35 C60 55, 75 70, 95 88" />
            <path d="M40 110 C60 90, 75 75, 95 55" />
          </g>
        </svg>
      </span>




      <span>ICKS</span>
    </span>
  );
}
