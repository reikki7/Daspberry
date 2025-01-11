import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { invoke, convertFileSrc } from "@tauri-apps/api/tauri";
import { Howl } from "howler";
import {
  faForward,
  faBackward,
  faPlay,
  faPause,
  faRepeat,
  faShuffle,
  faVolumeUp,
  faVolumeMute,
  faCompactDisc,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import artDefault from "../../assets/art-default.jpg";
import ProgressBar from "./ProgressBar";
import VolumeSlider from "./VolumeSlider";
import MusicMenuModal from "./MusicMenuModal";
import {
  saveMetadataToCache,
  getAllCachedFiles,
  clearCache,
} from "../../utils/musicCache";

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
  const [musicMenu, setMusicMenu] = useState(false);
  const [songMetadata, setSongMetadata] = useState({});
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const isShuffleRef = useRef(isShuffle);
  const isLoopingSingleRef = useRef(isLoopingSingle);
  const currentTrackIndexRef = useRef(currentTrackIndex);
  const volumeSliderRef = useRef(null);
  const objectUrlsRef = useRef([]);
  const animationFrameRef = useRef(null);
  // Consolidated refs
  const playerStateRef = useRef({
    isLoopingSingle: false,
    currentTrackIndex: 0,
    currentSound: null,
  });

  const location = useLocation();
  const isHomeActive = location.pathname === "/";

  // Update Refs When States Change
  useEffect(() => {
    isShuffleRef.current = isShuffle;
    isLoopingSingleRef.current = isLoopingSingle;
    currentTrackIndexRef.current = currentTrackIndex;
  }, [isShuffle, isLoopingSingle, currentTrackIndex]);

  // Shuffle Array Helper
  const shuffleArray = useCallback((array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // Load Music Files Function
  const loadMusicFiles = useCallback(
    async (isRefresh = false) => {
      try {
        setIsLoadingMetadata(true);

        let files = [];
        if (isRefresh) {
          // Clear the entire cache before refreshing
          await clearCache();

          // Fetch fresh files
          const data = await invoke("get_music_files_with_metadata");

          // Process and cache new files
          files = await Promise.all(
            data.map(async (file) => {
              // Ensure we have valid metadata
              const metadata = file.metadata || {
                title: file.path
                  .split("\\")
                  .pop()
                  .replace(/\.[^/.]+$/, ""),
                artist: "Unknown Artist",
                album: "Unknown Album",
              };

              const albumArtBlob = metadata.album_art
                ? await fetch(
                    `data:image/jpeg;base64,${metadata.album_art}`
                  ).then((res) => res.blob())
                : null;

              const albumArtUrl = albumArtBlob
                ? URL.createObjectURL(albumArtBlob)
                : artDefault;

              // Save to cache with processed metadata
              await saveMetadataToCache(file.path, metadata, albumArtBlob);

              return {
                path: file.path,
                metadata,
                albumArt: albumArtUrl,
                name:
                  metadata.title ||
                  file.path
                    .split("\\")
                    .pop()
                    .replace(/\.[^/.]+$/, ""),
              };
            })
          );
        } else {
          // Load cached files
          const cachedFiles = await getAllCachedFiles();
          files = cachedFiles.map((file) => ({
            ...file,
            albumArt: file.albumArtBlob
              ? URL.createObjectURL(file.albumArtBlob)
              : artDefault,
            name:
              file.metadata?.title ||
              file.path
                .split("\\")
                .pop()
                .replace(/\.[^/.]+$/, ""),
          }));
        }

        // Clean up old object URLs
        objectUrlsRef.current.forEach((url) => {
          if (url !== artDefault) {
            URL.revokeObjectURL(url);
          }
        });

        // Update state
        setMusicFiles(files);
        const metadataMap = files.reduce((acc, file) => {
          acc[file.path] = file.metadata;
          return acc;
        }, {});
        setSongMetadata(metadataMap);

        if (isShuffleRef.current) {
          setShuffledIndices(shuffleArray(files.map((_, index) => index)));
        }

        // Store new object URLs
        objectUrlsRef.current = files
          .map((file) => file.albumArt)
          .filter((url) => url !== artDefault);

        setIsLoadingMetadata(false);
      } catch (error) {
        console.error("Error loading music files:", error);
        setIsLoadingMetadata(false);
      }
    },
    [shuffleArray]
  );

  // Initial Load on Component Mount
  useEffect(() => {
    loadMusicFiles();
    setIsPlaying(false);
  }, [loadMusicFiles]);

  // Cleanup Object URLs on Unmount
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => {
        if (url !== artDefault) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  // Define getNextTrackIndex and getPrevTrackIndex
  const getNextTrackIndex = useCallback(
    (i) => {
      if (isShuffleRef.current) {
        return (i + 1) % shuffledIndices.length;
      } else {
        return (i + 1) % musicFiles.length;
      }
    },
    [shuffledIndices.length, musicFiles.length]
  );

  const getPrevTrackIndex = useCallback(
    (i) => {
      if (isShuffleRef.current) {
        return i === 0 ? shuffledIndices.length - 1 : i - 1;
      } else {
        return i === 0 ? musicFiles.length - 1 : i - 1;
      }
    },
    [shuffledIndices.length, musicFiles.length]
  );

  useEffect(() => {
    const updatePlayerState = () => {
      if (currentSound) {
        // Update volume
        currentSound.volume(isMuted ? 0 : volume);

        // Update current time
        const timeInterval = setInterval(() => {
          setCurrentTime(currentSound.seek() || 0);
        }, 10);

        playerStateRef.current = {
          isLoopingSingle,
          currentTrackIndex,
          currentSound,
        };

        return () => {
          clearInterval(timeInterval);
        };
      }
    };

    const cleanup = updatePlayerState();
    return cleanup;
  }, [currentSound, volume, isMuted, isLoopingSingle, currentTrackIndex]);

  // Play Music Function
  const playMusic = useCallback(
    async (index, enableAutoPlay = true) => {
      const actualIndex = isShuffleRef.current ? shuffledIndices[index] : index;
      console.log(`Attempting to play track at index: ${actualIndex}`);
      const fileToPlay = musicFiles[actualIndex];
      if (!fileToPlay) {
        console.error(`No file found at index ${actualIndex}`);
        return;
      }

      if (currentSound) {
        currentSound.stop();
      }

      const trackUrl = convertFileSrc(fileToPlay.path);

      const actualTitle =
        fileToPlay.metadata?.title ||
        fileToPlay.path
          .split("\\")
          .pop()
          .replace(/\.[^/.]+$/, ""); // Fallback to filename
      const actualArtist = fileToPlay.metadata?.artist || "Unknown Artist";

      setTrackTitle(actualTitle);
      setTags({ title: actualTitle, artist: actualArtist });
      setAlbumArt(fileToPlay.albumArt || artDefault);
      setCurrentTrackIndex(index); // Set index here

      const newSound = new Howl({
        src: [trackUrl],
        format: ["mp3", "wav", "flac", "m4a", "ogg"],
        autoplay: enableAutoPlay,
        html5: true,
        loop: false,
        volume: isMuted ? 0 : volume,
        onload: () => {
          setDuration(newSound.duration());
        },
        onplay: () => {
          setIsPlaying(true);
          setCurrentTrack(trackUrl);
          setCurrentTrackIndex(index);
          setDuration(newSound.duration());

          // Cancel any existing animation frame
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          // Start new progress update loop
          animationFrameRef.current = requestAnimationFrame(updateProgress);

          console.log(`Now playing: ${actualTitle} by ${actualArtist}`);
        },
        onpause: () => {
          setIsPlaying(false);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
        },
        onend: () => {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }

          if (isLoopingSingleRef.current) {
            newSound.seek(0);
            newSound.play();
          } else {
            const nextI = getNextTrackIndex(currentTrackIndexRef.current);
            playMusic(nextI, true);
          }
        },
        onloaderror: (id, err) => {
          console.error("Howler load error:", err);
          const nextI = getNextTrackIndex(currentTrackIndexRef.current);
          playMusic(nextI, enableAutoPlay);
        },
      });

      // setCurrentTrackIndex()
      setCurrentSound(newSound);

      // Update player state ref
      playerStateRef.current = {
        isLoopingSingle,
        currentTrackIndex: actualIndex,
        currentSound: newSound,
      };
    },
    [
      currentSound,
      volume,
      isMuted,
      musicFiles,
      shuffledIndices,
      getNextTrackIndex,
    ]
  );

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (currentSound) {
        currentSound.stop();
        currentSound.unload();
      }
    };
  }, [currentSound]);

  useEffect(() => {
    const loadFiles = async () => {
      await loadMusicFiles();
      setLoaded(true);
    };
    loadFiles();
  }, []);

  useEffect(() => {
    if (loaded && musicFiles.length > 0) {
      const randomIndex = Math.floor(Math.random() * musicFiles.length);
      setCurrentTrackIndex(randomIndex);
      playMusic(randomIndex, false);
    }
  }, [loaded, musicFiles]);

  // Function to Update Progress
  const updateProgress = useCallback(() => {
    if (currentSound && currentSound.playing()) {
      const seek = currentSound.seek();
      if (typeof seek === "number") {
        setCurrentTime(seek);
      }
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [currentSound, setCurrentTime, animationFrameRef]);

  useEffect(() => {
    if (isPlaying && currentSound) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [isPlaying, currentSound]);

  // Toggle Play/Pause
  const togglePlayPause = useCallback(() => {
    if (!currentSound) return;
    if (isPlaying) {
      currentSound.pause();
      setIsPlaying(false);
    } else {
      currentSound.play();
      setIsPlaying(true);
    }
  }, [currentSound, isPlaying]);

  // Toggle Shuffle
  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const newVal = !prev;
      if (newVal) {
        const indices = shuffleArray(
          Array.from({ length: musicFiles.length }, (_, i) => i)
        );
        setShuffledIndices(indices);

        const oldActual = isShuffleRef.current
          ? shuffledIndices[currentTrackIndex]
          : currentTrackIndex;

        const newIndex = indices.findIndex((v) => v === oldActual);
        setCurrentTrackIndex(newIndex);
      } else {
        const realIndex = isShuffleRef.current
          ? shuffledIndices[currentTrackIndex]
          : currentTrackIndex;
        setCurrentTrackIndex(realIndex);
        setShuffledIndices([]);
      }
      return newVal;
    });
  }, [musicFiles.length, shuffledIndices, currentTrackIndex, shuffleArray]);

  // Toggle Repeat Single
  const toggleRepeatSingle = useCallback(() => {
    setIsLoopingSingle((prev) => !prev);
  }, []);

  // Toggle Next Track
  const toggleNextTrack = useCallback(() => {
    const i = currentTrackIndexRef.current;
    const nextIndex = getNextTrackIndex(i);
    playMusic(nextIndex, isPlaying);
  }, [getNextTrackIndex, isPlaying, playMusic]);

  // Toggle Previous Track
  const togglePrevTrack = useCallback(() => {
    const i = currentTrackIndexRef.current;
    const prevIndex = getPrevTrackIndex(i);
    playMusic(prevIndex, isPlaying);
  }, [getPrevTrackIndex, isPlaying, playMusic]);

  // Toggle Play (on track selection)
  const togglePlay = useCallback(
    (userClickedIndex) => {
      const playingIndex = isShuffle
        ? shuffledIndices[currentTrackIndex]
        : currentTrackIndex;

      if (playingIndex === userClickedIndex) {
        if (currentSound) {
          currentSound.stop();
          currentSound.play();
        }
      } else {
        // If a different track is selected, play the new track
        playMusic(userClickedIndex, true);
      }
    },
    [currentSound, currentTrackIndex, isShuffle, shuffledIndices, playMusic]
  );

  // Handle Volume Change
  const handleVolumeChange = useCallback(
    (e) => {
      if (!currentSound) return;
      const newVolume = parseFloat(e.target.value);
      if (isMuted) {
        setIsMuted(false);
      }
      setVolume(newVolume);
      currentSound.volume(newVolume);
    },
    [currentSound, isMuted]
  );

  const handleWheel = useCallback(
    (e) => {
      if (!currentSound) return;

      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      const newVolume = Math.max(0, Math.min(1, volume + delta));

      setVolume(newVolume);
      currentSound.volume(newVolume);
      if (isMuted) setIsMuted(false);
    },
    [currentSound, volume, isMuted]
  );

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newVal = !prev;
      if (currentSound) {
        currentSound.mute(newVal);
      }
      return newVal;
    });
  }, [currentSound]);

  // Handle Progress Change
  const handleProgressChange = useCallback(
    (e) => {
      if (!currentSound) return;
      const progress = parseFloat(e.target.value);
      const newTime = (progress / 100) * currentSound.duration();
      currentSound.seek(newTime);
      setCurrentTime(newTime);
    },
    [currentSound]
  );

  // Format Time
  const formatTime = useCallback((time) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? "0" + sec : sec}`;
  }, []);

  // Keyboard Shortcuts Handler (Consolidated Effect)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isHomeActive) return;
      const { currentSound, isLoopingSingle, currentTrackIndex } =
        playerStateRef.current;

      if (!currentSound || musicMenu) return;

      // Prevent default behavior for Spacebar
      if (
        event.code === "Space" &&
        document.activeElement.tagName === "INPUT"
      ) {
        event.preventDefault();
        document.activeElement.blur();
      }

      switch (event.code) {
        case "Space":
          event.preventDefault();
          isPlaying ? currentSound.pause() : currentSound.play();
          break;

        case "Enter":
          event.preventDefault();
          setMusicMenu((prev) => !prev);
          event.stopPropagation();
          break;

        case "KeyS":
          event.preventDefault();
          isShuffleRef.current = !isShuffle;
          setIsShuffle((prev) => !prev);
          break;

        // Toggle Shuffle
        case "KeyR":
        case "KeyL":
          event.preventDefault();
          isLoopingSingleRef.current = !isLoopingSingle;
          setIsLoopingSingle((prev) => !prev);
          break;

        // Mute/Unmute
        case "KeyM":
          event.preventDefault();
          setIsMuted((prev) => {
            const newMutedState = !prev;
            currentSound.mute(newMutedState);
            return newMutedState;
          });
          break;

        // Increase Volume
        case "ArrowUp": {
          event.preventDefault();
          const increasedVolume = Math.min(currentSound.volume() + 0.03, 1);
          currentSound.volume(increasedVolume);
          setVolume(increasedVolume);
          event.stopPropagation();
          break;
        }

        // Decrease Volume
        case "ArrowDown": {
          event.preventDefault();
          const decreasedVolume = Math.max(currentSound.volume() - 0.03, 0);
          currentSound.volume(decreasedVolume);
          setVolume(decreasedVolume);
          event.stopPropagation();
          break;
        }

        // Seek Forward
        case "ArrowRight":
          event.preventDefault();
          if (event.ctrlKey) {
            currentSound.seek(
              Math.min(currentSound.seek() + 20, currentSound.duration())
            );
          } else if (event.shiftKey) {
            playMusic(
              getNextTrackIndex(currentTrackIndex),
              isPlaying ? true : false
            );
          } else {
            currentSound.seek(
              Math.min(currentSound.seek() + 2, currentSound.duration())
            );
          }
          break;

        // Seek Backward
        case "ArrowLeft":
          if (event.ctrlKey) {
            currentSound.seek(Math.max(currentSound.seek() - 20, 0));
          } else if (event.shiftKey) {
            playMusic(
              getPrevTrackIndex(currentTrackIndex),
              isPlaying ? true : false
            );
          } else {
            currentSound.seek(Math.max(currentSound.seek() - 2, 0));
          }
          break;
      }
      document.activeElement.blur();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [musicMenu, isHomeActive, isPlaying, currentSound]);

  // Play Next Track on Initial Load if MusicFiles are Available
  useEffect(() => {
    if (musicFiles.length > 0 && !currentSound) {
      playMusic(currentTrackIndex, false);
    }
  }, [musicFiles, currentSound, currentTrackIndex, playMusic]);

  return (
    <div className="flex w-full text-white rounded-3xl justify-between overflow-hidden ">
      <div className="flex flex-col items-center px-3 pl-4 justify-center gap-1.5">
        <button
          onClick={toggleMute}
          className="w-14 h-14 flex items-center justify-center duration-200 shadow-xl bg-white/10 rounded-full text-white hover:opacity-80"
          style={{ filter: "drop-shadow(2px 2px 20px #000000)" }}
        >
          <div className="bg-gray-950/40 w-10 h-10 flex justify-center items-center rounded-full">
            <FontAwesomeIcon icon={isMuted ? faVolumeMute : faVolumeUp} />
          </div>
        </button>
        {/* Volume slider (with wheel support) */}
        <div
          className="bg-white/10 shadow-2xl p-2 rounded-3xl"
          onWheel={handleWheel}
        >
          <VolumeSlider
            value={volume}
            onChange={handleVolumeChange}
            isMuted={isMuted}
            volumeSliderRef={volumeSliderRef}
          />
        </div>
      </div>

      {/* Center: Track info + controls */}
      <div className="flex flex-col w-full">
        {/* Track Info */}
        <div className="flex items-center justify-between">
          <div className="p-4 h-[101px] flex flex-col justify-center">
            <div className="relative max-w-[315px] overflow-hidden">
              <div className="text-lg w-[215px] font-semibold text-white whitespace-nowrap truncate">
                {tags?.title || trackTitle || "No Track Loaded"}
              </div>
            </div>
            <h3 className="text-sm text-gray-400 whitespace-nowrap truncate">
              {Array.isArray(tags?.artist) && tags.artist.length > 0
                ? tags.artist[0]
                : tags?.artist || "Unknown Artist"}
            </h3>
          </div>
          {/* Open music library */}
          <button
            className="group mr-3 bg-gray-950/30 hover:bg-gray-950/60 duration-200 p-5 rounded-xl"
            onClick={() => setMusicMenu((prev) => !prev)}
          >
            <FontAwesomeIcon
              icon={faCompactDisc}
              className="text-5xl group-hover:rotate-180 duration-500"
            />
          </button>
        </div>

        {/* Music Menu Modal */}
        {musicMenu && (
          <MusicMenuModal
            musicFiles={musicFiles}
            currentTrack={currentTrack}
            togglePlay={togglePlay}
            setMusicMenu={setMusicMenu}
            musicMenu={musicMenu}
            tags={tags}
            albumArt={albumArt}
            metadata={songMetadata}
            setIsPlaying={setIsPlaying}
            isPlaying={isPlaying}
            toggleNextTrack={toggleNextTrack}
            togglePrevTrack={togglePrevTrack}
            togglePlayPause={togglePlayPause}
            toggleShuffle={toggleShuffle}
            toggleRepeatSingle={toggleRepeatSingle}
            isShuffle={isShuffle}
            isLoopingSingle={isLoopingSingle}
            loadMusicFiles={loadMusicFiles}
            isLoadingMetadata={isLoadingMetadata}
          />
        )}

        {/* Player Controls */}
        <div className="flex flex-col items-center gap-2 p-3 rounded-3xl bg-gray-950/30 mx-2">
          <div className="flex gap-2">
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              className={`w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-white/10 duration-200 ${
                isShuffle ? "bg-white/10" : ""
              }`}
            >
              <FontAwesomeIcon icon={faShuffle} />
            </button>
            {/* Prev */}
            <button
              onClick={togglePrevTrack}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-gray-950/30 duration-200"
            >
              <FontAwesomeIcon icon={faBackward} />
            </button>
            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              className="w-10 h-10 rounded-full text-white hover:bg-gray-950/30 duration-200"
            >
              <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
            </button>
            {/* Next */}
            <button
              onClick={toggleNextTrack}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-gray-950/30 duration-200"
            >
              <FontAwesomeIcon icon={faForward} />
            </button>
            {/* Repeat Single */}
            <button
              onClick={toggleRepeatSingle}
              className={`w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-white/10 duration-200 ${
                isLoopingSingle ? "bg-white/10" : ""
              }`}
            >
              <FontAwesomeIcon icon={faRepeat} />
            </button>
          </div>

          {/* Progress Bar + Time */}
          <div className="flex flex-col gap-1">
            <ProgressBar
              value={duration ? (currentTime / duration) * 100 : 0}
              onChange={handleProgressChange}
            />
            <div className="flex text-[10px] text-white/40 justify-between">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Album art */}
      <div className="rounded-3xl relative h-[227px] w-[437px] overflow-hidden flex items-center justify-center bg-white">
        <img
          onError={() => setAlbumArt(artDefault)}
          src={albumArt}
          alt="Album Art"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export default MusicPlayer;
