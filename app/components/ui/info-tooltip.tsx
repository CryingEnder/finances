"use client";

import { Info } from "lucide-react";
import { createPortal } from "react-dom";
import { useRef, useState, useEffect } from "react";

interface InfoTooltipProps {
  content: string;
  className?: string;
  placement?: "top" | "bottom";
}

export function InfoTooltip({
  content,
  className = "",
  placement = "top",
}: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) {
        return;
      }

      const rect = anchor.getBoundingClientRect();
      setPosition({
        top: "bottom" === placement ? rect.bottom + 8 : rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isVisible, placement]);

  const tooltip =
    isVisible && "undefined" !== typeof document
      ? createPortal(
          <div
            role="tooltip"
            className="fixed z-9999 w-48 sm:w-64 px-2 py-1.5 bg-zinc-800 text-white text-xs rounded-lg shadow-lg pointer-events-none"
            style={{
              top: position.top,
              left: position.left,
              transform:
                "top" === placement
                  ? "translate(-50%, -100%)"
                  : "translateX(-50%)",
            }}
          >
            <div className="whitespace-pre-line">{content}</div>
            <div
              className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
                "top" === placement
                  ? "top-full border-t-zinc-800"
                  : "bottom-full border-b-zinc-800"
              }`}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        ref={anchorRef}
        className="relative inline-flex shrink-0"
        onBlur={() => {
          setIsVisible(false);
        }}
        onFocus={() => {
          setIsVisible(true);
        }}
        onMouseEnter={() => {
          setIsVisible(true);
        }}
        onMouseLeave={() => {
          setIsVisible(false);
        }}
      >
        <Info
          aria-hidden="true"
          className={`w-4 h-4 text-zinc-400 hover:text-zinc-300 cursor-help ${className}`}
        />
      </span>
      {tooltip}
    </>
  );
}
