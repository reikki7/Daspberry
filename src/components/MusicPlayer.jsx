import { useState, useEffect, useRef } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/tauri";
import { parseBlob } from "music-metadata";
import {
  faForward,
  faBackward,
  faPlay,
  faPause,
  faRepeat,
  faShuffle,
  faVolumeOff,
  faVolumeUp,
} from "@fortawesome/free-solid-svg-icons";
import { Howl } from "howler";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import artDefault from "../assets/art-default.jpg";
import ProgressBar from "./ProgressBar";
import VolumeSlider from "./VolumeSlider";

const MusicPlayer = () => {
  const [musicFiles, setMusicFiles] = useState([]);
  const [currentSound, setCurrentSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isLoopingSingle, setIsLoopingSingle] = useState(false);
  const [volume, setVolume] = useState(0.2);
  const [albumArt, setAlbumArt] = useState(artDefault);
  const [tags, setTags] = useState(null);
  const [trackTitle, setTrackTitle] = useState(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [shouldScroll, setShouldScroll] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    loadMusicFiles();
  }, []);

  useEffect(() => {
    const titleElement = titleRef.current;
    if (titleElement) {
      setShouldScroll(titleElement.scrollWidth > titleElement.clientWidth);
    }
  }, [trackTitle]);

  useEffect(() => {
    if (currentSound) {
      currentSound.volume(volume);
    }
  }, [volume, currentSound]);

  const loadMusicFiles = async () => {
    try {
      const files = await invoke("get_music_files");
      setMusicFiles(files);
      setShuffledIndices(Array.from({ length: files.length }, (_, i) => i));
    } catch (error) {
      console.error("Error loading music files:", error);
    }
  };

  useEffect(() => {
    if (tags === null && musicFiles.length > 0) {
      playMusic(Math.floor(Math.random() * musicFiles.length));
    }
  }, [musicFiles, tags]);

  const shuffleArray = (array) => {
    let shuffledArray = array.slice();
    for (let i = shuffledArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledArray[i], shuffledArray[j]] = [
        shuffledArray[j],
        shuffledArray[i],
      ];
    }
    return shuffledArray;
  };
  const getPlayIndex = (requestedIndex) => {
    if (!isShuffle) return requestedIndex;
    return shuffledIndices.findIndex((idx) => idx === requestedIndex);
  };

  const getNextTrackIndex = (currentIndex) => {
    if (!isShuffle) {
      return (currentIndex + 1) % musicFiles.length;
    }
    return (currentIndex + 1) % shuffledIndices.length;
  };

  const getPrevTrackIndex = (currentIndex) => {
    if (!isShuffle) {
      return currentIndex === 0 ? musicFiles.length - 1 : currentIndex - 1;
    }
    return currentIndex === 0 ? shuffledIndices.length - 1 : currentIndex - 1;
  };

  const playMusic = (index) => {
    const actualIndex = isShuffle ? shuffledIndices[index] : index;
    const fileToPlay = musicFiles[actualIndex];
    const url = convertFileSrc(fileToPlay.path);

    if (currentSound) {
      currentSound.stop();
    }

    const currentTrackTitle = fileToPlay.name.replace(/\.mp3$/i, "");
    setTrackTitle(currentTrackTitle);
    setCurrentTrackIndex(index);

    async function fetchAndReadTags(url) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const metadata = await parseBlob(blob);
        setTags(metadata.common);

        if (metadata.common.picture) {
          const content = new Uint8Array(metadata.common.picture[0].data);
          const blob = new Blob([content], { type: "image/jpeg" });
          const url = URL.createObjectURL(blob);
          setAlbumArt(url);
        } else {
          setAlbumArt(artDefault);
        }
      } catch (error) {
        console.error("Error fetching the file:", error);
      }
    }

    fetchAndReadTags(url);

    const sound = new Howl({
      src: [url],
      format: ["mp3", "wav"],
      autoplay: autoPlay,
      loop: isLoopingSingle,
      html5: true,
      volume: volume,
      onplay: () => {
        setIsPlaying(true);
        setCurrentTrack(url);
        setCurrentTrackIndex(index);
        setDuration(sound.duration());
      },
      onend: () => {
        if (!isLoopingSingle) {
          playMusic(getNextTrackIndex(index));
        }
      },
      onpause: () => {
        setIsPlaying(false);
      },
      onloaderror: () => {
        console.error("Error loading the file");
        playMusic(getNextTrackIndex(index));
      },
      onupdate: () => {
        if (currentSound) {
          setCurrentTime(currentSound.seek());
        }
      },
    });

    setCurrentSound(sound);
    sound.play();
  };

  function handleProgressChange(event) {
    if (currentSound && duration > 0) {
      const newTime = (event.target.value / 100) * duration;
      currentSound.seek(newTime);
      setCurrentTime(newTime);
    }
  }

  const togglePlay = (index) => {
    const playIndex = isShuffle ? getPlayIndex(index) : index;
    playMusic(playIndex);
  };

  const toggleRepeatSingle = () => {
    setIsLoopingSingle(!isLoopingSingle);
  };

  const toggleShuffle = () => {
    if (!isShuffle) {
      const newShuffledIndices = shuffleArray(
        Array.from({ length: musicFiles.length }, (_, i) => i)
      );
      setShuffledIndices(newShuffledIndices);
      if (currentTrack) {
        const currentOriginalIndex = musicFiles.findIndex(
          (file) => convertFileSrc(file.path) === currentTrack
        );
        const newPosition = newShuffledIndices.findIndex(
          (index) => index === currentOriginalIndex
        );
        setCurrentTrackIndex(newPosition);
      }
    } else {
      if (currentTrack) {
        const originalIndex = shuffledIndices[currentTrackIndex];
        setCurrentTrackIndex(originalIndex);
      }
    }
    setIsShuffle(!isShuffle);
  };

  const togglePlayPause = () => {
    if (currentSound) {
      if (isPlaying) {
        currentSound.pause();
        setAutoPlay(true);
      } else {
        currentSound.play();
      }
    }
  };

  const stopMusic = () => {
    if (currentSound) {
      currentSound.stop();
      setCurrentTrack(null);
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    setVolume(isMuted ? previousVolume : 0);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  useEffect(() => {
    console.log(tags);
  }, [tags]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex w-full text-white rounded-3xl justify-between overflow-hidden">
      {/* Volume */}
      <div className="flex flex-col items-center px-3 pl-4 justify-center gap-2">
        <button
          onClick={toggleMute}
          className="w-14 h-14 flex items-center justify-center shadow-xl bg-white/10 rounded-full text-white hover:opacity-80"
          style={{ filter: "drop-shadow(2px 2px 20px #000000)" }}
        >
          <div className="bg-gray-950/40 w-10 h-10 flex justify-center items-center rounded-full">
            <FontAwesomeIcon icon={isMuted ? faVolumeOff : faVolumeUp} />
          </div>
        </button>

        <div className="bg-white/10 shadow-2xl p-2 rounded-3xl">
          <VolumeSlider
            value={volume}
            onChange={handleVolumeChange}
            isMuted={isMuted}
          />
        </div>
      </div>

      {/* Music Player */}
      <div className="flex flex-col w-full bg-gray-950/10 rounded-3xl mx-2">
        {/* Track Information */}
        <div className="p-4 h-[101px]">
          <div className="relative w-[315px] overflow-hidden">
            <div
              ref={titleRef}
              className="text-lg font-semibold text-white whitespace-nowrap truncate"
            >
              {tags?.title || trackTitle || "-"}
            </div>
          </div>
          <h3 className="text-sm text-gray-400">{tags?.artist || "-"}</h3>
        </div>

        {/* Music Player Controls */}
        <div className="flex flex-col items-center gap-2 p-3 rounded-3xl bg-gray-950/30 mx-2">
          <div className="flex gap-2">
            <button
              onClick={toggleShuffle}
              className={`w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-gray-950/30 duration-200 ${
                isShuffle && "bg-gray-950/30"
              }`}
            >
              <FontAwesomeIcon icon={faShuffle} />
            </button>
            <button
              onClick={() => playMusic(getPrevTrackIndex(currentTrackIndex))}
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
              onClick={() => playMusic(getNextTrackIndex(currentTrackIndex))}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-gray-950/30 duration-200"
            >
              <FontAwesomeIcon icon={faForward} />
            </button>
            <button
              onClick={toggleRepeatSingle}
              className={`w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-gray-950/30 duration-200 ${
                isLoopingSingle && "bg-gray-950/30"
              }`}
            >
              <FontAwesomeIcon icon={faRepeat} />
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <ProgressBar
              value={(currentTime / duration) * 100 || 0}
              onChange={handleProgressChange}
            />

            <div className="flex text-[10px] text-white/40 justify-between">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      <img src={albumArt} className="h-56 rounded-3xl w-56" />
      {/* <div className="flex-grow overflow-y-auto">
        <div className="text-sm font-medium mb-2">Library</div>
        <div className="flex flex-col gap-1">
          {tracks.map((track, index) => (
            <button
              key={track.path}
              onClick={() => playTrack(index)}
              className={`text-left px-3 py-2 rounded-lg hover:bg-white/10 truncate ${
                currentTrackIndex === index ? "bg-white/20" : ""
              }`}
            >
              {track.name}
            </button>
          ))}
        </div>
      </div> */}
    </div>
  );
};

export default MusicPlayer;
