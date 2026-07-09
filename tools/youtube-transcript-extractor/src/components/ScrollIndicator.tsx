interface ScrollIndicatorProps {
  scale?: number;
}

export default function ScrollIndicator({ scale = 1 }: ScrollIndicatorProps) {
  return (
    <div
      className="flex flex-col items-center"
      style={{ transform: `scale(${scale})` }}
      aria-hidden="true"
    >
      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1677FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={i > 0 ? '-mt-1' : ''}
          style={{
            animation: `chevronFadeSlide 1200ms ease-in-out ${i * 200}ms infinite`,
          }}
        >
          <polyline points="4 8 12 16 20 8" />
        </svg>
      ))}
    </div>
  );
}
