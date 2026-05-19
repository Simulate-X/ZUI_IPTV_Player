import { useEffect, useState } from 'react';

type Props = {
  windowStart: number;
  windowEnd: number;
};

export function CurrentTimeIndicator({ windowStart, windowEnd }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const pct = ((now - windowStart) / (windowEnd - windowStart)) * 100;
  if (pct < 0 || pct > 100) return null;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
      style={{ left: `${pct}%` }}
    >
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500" />
    </div>
  );
}
