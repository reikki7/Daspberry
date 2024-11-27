import { useState, useEffect } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/tauri";
import { parseBlob } from "music-metadata";
import {
  faForward,
  faBackward,
  faPlay,
  faPause,
  faRepeat,
  faVolumeLow,
  faVolumeHigh,
  faShuffle,
} from "@fortawesome/free-solid-svg-icons";
import { Howl } from "howler";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import artDefault from "../assets/art-default.jpg";

const MusicPlayer = () => {
  const [musicFiles, setMusicFiles] = useState([]);
  const [currentSound, setCurrentSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isLoopingSingle, setIsLoopingSingle] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [albumArt, setAlbumArt] = useState(artDefault);
  const [tags, setTags] = useState(null);
  const [trackTitle, setTrackTitle] = useState(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState([]);

  useEffect(() => {
    loadMusicFiles();
  }, []);

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
      autoplay: true,
      loop: isLoopingSingle,
      html5: true,
      volume: volume,
      onplay: () => {
        setIsPlaying(true);
        setCurrentTrack(url);
        setCurrentTrackIndex(index);
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
        playMusic(getNextTrackIndex(index));
      },
    });

    setCurrentSound(sound);
    sound.play();
  };

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

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  return (
    <div className="p-4">
      <div className="fixed bg-white w-full">
        {tags && (
          <div className="mb-4 p-4 bg-gray-100 rounded">
            <div className="flex items-start">
              {albumArt && (
                <img
                  src={albumArt}
                  alt="Album Art"
                  className="w-32 h-32 object-cover rounded mr-4"
                />
              )}
              <div>
                <p className="font-bold text-lg">
                  {tags.title || trackTitle || "-"}
                </p>
                <p>Artist: {tags.artist || "-"}</p>
                <p>Album: {tags.album || "-"}</p>
                <p>Year: {tags.year || "-"}</p>
                <p>Genre: {tags.genre || "-"}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center">
          <button
            onClick={toggleShuffle}
            className={`bg-blue-500 text-white px-4 py-2 rounded mr-2 ${
              isShuffle ? "bg-green-500" : ""
            }`}
          >
            <FontAwesomeIcon icon={faShuffle} />
          </button>

          <button
            onClick={() => playMusic(getPrevTrackIndex(currentTrackIndex))}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          >
            <FontAwesomeIcon icon={faBackward} />
          </button>
          <button
            onClick={togglePlayPause}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          >
            <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
          </button>
          <button
            onClick={() => playMusic(getNextTrackIndex(currentTrackIndex))}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          >
            <FontAwesomeIcon icon={faForward} />
          </button>
          <button
            onClick={stopMusic}
            className="bg-red-500 text-white px-4 py-2 rounded mr-2"
          >
            Stop
          </button>
          <button
            onClick={toggleRepeatSingle}
            className={`bg-blue-500 text-white px-4 py-2 rounded mr-2 ${
              isLoopingSingle ? "bg-green-500" : ""
            }`}
          >
            <FontAwesomeIcon icon={faRepeat} />
          </button>

          <div className="flex items-center ml-4">
            <FontAwesomeIcon icon={faVolumeLow} className="mr-2" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <FontAwesomeIcon icon={faVolumeHigh} className="ml-2" />
          </div>
        </div>
      </div>
      <div className="grid gap-2 mt-72" data-tauri-drag-region>
        {musicFiles.map((file, index) => (
          <div
            key={index}
            className={`p-2 border rounded cursor-pointer ${
              currentTrack === convertFileSrc(file.path)
                ? "bg-blue-100"
                : "hover:bg-gray-100"
            }`}
            onClick={() => togglePlay(index)}
          >
            <p className="font-medium">{file.name.replace(/\.mp3$/i, "")}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MusicPlayer;
