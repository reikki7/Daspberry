import React from "react";

const VolumeSlider = ({ value, onChange, isMuted, volumeSliderRef }) => {
  return (
    <div className="bg-gray-950/40 p-3 rounded-3xl">
      <div className="relative h-28 w-[5px] mx-auto">
        {/* Slider track with a white trail */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2 bg-white/10 h-full w-full rounded-full overflow-hidden"
          style={{
            background: `linear-gradient(to top, white ${
              isMuted ? 0 : value * 100
            }%, rgba(255, 255, 255, 0.1) ${isMuted ? 0 : value * 100}%)`,
          }}
        ></div>

        {/* Input slider */}
        <input
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={isMuted ? 0 : value}
          onChange={onChange}
          ref={volumeSliderRef}
          className="absolute transform duration-300 rotate-[-90deg] h-28 -mx-[53.6px]
            appearance-none w-28 bg-transparent cursor-pointer
            [&::-webkit-slider-runnable-track]:appearance-none
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:h-0
            [&::-webkit-slider-thumb]:w-0
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:transition-colors
            [&::-moz-range-thumb]:appearance-none
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white"
        />
      </div>
    </div>
  );
};

export default VolumeSlider;
