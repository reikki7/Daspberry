const ProgressBar = ({ value, onChange }) => {
  return (
    <div className="relative w-64">
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={onChange}
        className="w-full h-1 bg-gray-200/20 rounded-full appearance-none cursor-pointer accent-white
          hover:h-2 transition-all duration-200
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-all
          [&::-webkit-slider-thumb]:duration-200
          [&::-webkit-slider-thumb]:hover:w-4
          [&::-webkit-slider-thumb]:hover:h-4
          [&::-moz-range-thumb]:appearance-none
          [&::-moz-range-thumb]:w-3
          [&::-moz-range-thumb]:h-3
          [&::-moz-range-thumb]:rounded-full
   
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:shadow-lg
          [&::-moz-range-thumb]:cursor-pointer
          [&::-moz-range-thumb]:transition-all
          [&::-moz-range-thumb]:duration-200
          [&::-moz-range-thumb]:hover:w-4
          [&::-moz-range-thumb]:hover:h-4
          [&::-webkit-slider-runnable-track]:bg-gradient-to-r
          [&::-moz-range-track]:bg-gradient-to-r
          [&::-moz-range-track]:from-white/50
          [&::-moz-range-track]:to-white/20"
        style={{
          background: `linear-gradient(to right, white ${value}%, gray 0)`,
        }}
      />
    </div>
  );
};

export default ProgressBar;
