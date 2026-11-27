"use client";

import { useRef } from "react";

/** Leans its content toward the pointer. */
export function Tilt({ children }: { children: React.ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const lean = (x: number, y: number) => {
    if (inner.current) inner.current.style.transform = `rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg)`;
  };
  return (
    <div className="[perspective:1200px]"
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const r = e.currentTarget.getBoundingClientRect();
        lean((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => lean(0, 0)}>
      <div ref={inner} className="transition-transform duration-200">{children}</div>
    </div>
  );
}
