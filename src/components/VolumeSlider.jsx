import React from "react";

const VolumeSlider = ({ value, onChange, isMuted }) => {
  return (
    <div className="bg-gray-950/40 p-3 rounded-3xl">
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={isMuted ? 0 : value}
        onChange={onChange}
        className="transform duration-300 rotate-[-90deg] h-28 -mx-12
          appearance-none w-28 bg-transparent cursor-pointer
          [&::-webkit-slider-runnable-track]:rounded-full
          [&::-webkit-slider-runnable-track]:bg-white/10
          [&::-webkit-slider-runnable-track]:h-1
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:mt-[-4px]
          [&::-webkit-slider-thumb]:hover:bg-blue-300
          [&::-webkit-slider-thumb]:transition-colors
          [&::-moz-range-track]:rounded-full
          [&::-moz-range-track]:bg-white/10
          [&::-moz-range-track]:h-1
          [&::-moz-range-thumb]:appearance-none
          [&::-moz-range-thumb]:h-3
          [&::-moz-range-thumb]:w-3
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-white
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:hover:bg-blue-300
          [&::-moz-range-thumb]:transition-colors"
      />
    </div>
  );
};

export default VolumeSlider;
