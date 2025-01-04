import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBackward,
  faForward,
  faPause,
  faPlay,
  faRepeat,
  faShuffle,
} from "@fortawesome/free-solid-svg-icons";

const MusicMenuPlayerControls = ({
  isPlaying,
  isShuffle,
  isLoopingSingle,
  togglePlayPause,
  toggleShuffle,
  toggleRepeatSingle,
  togglePrevTrack,
  toggleNextTrack,
}) => {
  return (
    <div className="flex gap-6 mr-8">
      <button
        onClick={toggleShuffle}
        className={`w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-white/10 duration-200 ${
          isShuffle && "bg-white/10"
        }`}
      >
        <FontAwesomeIcon icon={faShuffle} />
      </button>
      <button
        onClick={togglePrevTrack}
        className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-gray-950/30 duration-200"
      >
        <FontAwesomeIcon icon={faBackward} />
      </button>
      <button
        onClick={togglePlayPause}
        className="w-10 h-10 rounded-full text-white hover:bg-gray-950/30 duration-200"
      >
        <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
      </button>
      <button
        onClick={toggleNextTrack}
        className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-gray-950/30 duration-200"
      >
        <FontAwesomeIcon icon={faForward} />
      </button>
      <button
        onClick={toggleRepeatSingle}
        className={`w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-white/10 duration-200 ${
          isLoopingSingle && "bg-white/10"
        }`}
      >
        <FontAwesomeIcon icon={faRepeat} />
      </button>
    </div>
  );
};

export default MusicMenuPlayerControls;
