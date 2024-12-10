import React, { useEffect, useRef, useState } from "react";

const ScrollingTitle = ({ title }) => {
  const containerRef = useRef(null);
  const titleRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [animationDuration, setAnimationDuration] = useState(0);

  useEffect(() => {
    const checkIfShouldScroll = () => {
      if (containerRef.current && titleRef.current) {
        const shouldAnimate =
          titleRef.current.offsetWidth > containerRef.current.offsetWidth;
        setShouldScroll(shouldAnimate);

        if (shouldAnimate) {
          // Calculate animation duration based on text length (100px per second)
          const duration = titleRef.current.offsetWidth / 100;
          setAnimationDuration(duration);
        }
      }
    };

    checkIfShouldScroll();
    // Recheck on window resize
    window.addEventListener("resize", checkIfShouldScroll);
    return () => window.removeEventListener("resize", checkIfShouldScroll);
  }, [title]);

  return (
    <div ref={containerRef} className="relative overflow-hidden w-full">
      <div
        ref={titleRef}
        className={`text-lg font-semibold text-white whitespace-nowrap ${
          shouldScroll ? "hover:pause-animation" : ""
        }`}
        style={
          shouldScroll
            ? {
                animation: `scrollText ${animationDuration}s linear infinite`,
                animationDelay: "1s",
                paddingRight: "50px", // Add space between the repeated text
              }
            : {}
        }
      >
        {title}
        {shouldScroll && <span className="pl-8">{title}</span>}
      </div>
    </div>
  );
};

export default ScrollingTitle;
