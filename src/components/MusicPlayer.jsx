import { useState, useEffect, useRef, useCallback } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/tauri";
import { parseBlob } from "music-metadata";
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
import { Howl } from "howler";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import artDefault from "../assets/art-default.jpg";
import ProgressBar from "./ProgressBar";
import VolumeSlider from "./VolumeSlider";
import MusicMenuModal from "./MusicMenuModal";

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
  const [albumArtList, setAlbumArtList] = useState([]);

  const isShuffleRef = useRef(isShuffle);
  const isLoopingSingleRef = useRef(isLoopingSingle);
  const currentTrackIndexRef = useRef(currentTrackIndex);
  const volumeSliderRef = useRef(null);

  // Play a random track on initial load
  useEffect(() => {
    if (musicFiles.length > 0) {
      const randomIndex = Math.floor(Math.random() * musicFiles.length);
      setCurrentTrackIndex(randomIndex);
      playMusic(randomIndex, false);
    }
  }, [musicFiles]);

  // Load music files on initial load
  useEffect(() => {
    loadMusicFiles();
  }, []);

  // Update refs for looping and current track index
  useEffect(() => {
    isLoopingSingleRef.current = isLoopingSingle;
    currentTrackIndexRef.current = currentTrackIndex;
  }, [isLoopingSingle, currentTrackIndex]);

  // Update shuffle ref
  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  // Combined Volume and Playing State Effect
  useEffect(() => {
    const updatePlayerState = () => {
      if (currentSound) {
        // Update volume
        currentSound.volume(isMuted ? 0 : volume);

        // Update current time
        const timeInterval = setInterval(() => {
          setCurrentTime(currentSound.seek() || 0);
        }, 10);

        // Update refs for event handlers
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

  // Fetch song metadata on music files change
  useEffect(() => {
    if (musicFiles.length > 0) {
      fetchSongMetadata(musicFiles);
    }
  }, [musicFiles, currentSound]);

  // Consolidated refs
  const playerStateRef = useRef({
    isLoopingSingle: false,
    currentTrackIndex: 0,
    currentSound: null,
  });

  // Keyboard Shortcuts Handler (Consolidated Effect)
  useEffect(() => {
    const handleKeyDown = (event) => {
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

        case "ArrowUp":
          event.preventDefault();
          const increasedVolume = Math.min(currentSound.volume() + 0.03, 1);
          currentSound.volume(increasedVolume); // Update Howler's volume
          setVolume(increasedVolume); // Update React state
          event.stopPropagation();
          break;

        case "ArrowDown":
          event.preventDefault();
          const decreasedVolume = Math.max(currentSound.volume() - 0.03, 0);
          currentSound.volume(decreasedVolume); // Update Howler's volume
          setVolume(decreasedVolume); // Update React state
          event.stopPropagation();
          break;

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
  }, [musicMenu, isPlaying, currentSound]);

  // Load music files from the system
  const loadMusicFiles = async () => {
    try {
      const files = await invoke("get_music_files");
      setMusicFiles(files);
      setShuffledIndices(Array.from({ length: files.length }, (_, i) => i));
    } catch (error) {
      console.error("Error loading music files:", error);
    }
  };

  // Shuffle an array
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

  const getPlayIndex = useCallback(
    (requestedIndex) => {
      return !isShuffle
        ? requestedIndex
        : shuffledIndices.findIndex((idx) => idx === requestedIndex);
    },
    [isShuffle, shuffledIndices]
  );

  const getNextTrackIndex = useCallback(
    (currentIndex) => {
      return !isShuffle
        ? (currentIndex + 1) % musicFiles.length
        : (currentIndex + 1) % shuffledIndices.length;
    },
    [isShuffle, musicFiles.length, shuffledIndices.length]
  );

  const getPrevTrackIndex = useCallback(
    (currentIndex) => {
      return !isShuffle
        ? currentIndex === 0
          ? musicFiles.length - 1
          : currentIndex - 1
        : currentIndex === 0
        ? shuffledIndices.length - 1
        : currentIndex - 1;
    },
    [isShuffle, musicFiles.length, shuffledIndices.length]
  );

  // IndexedDB
  const initDB = async () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("MusicPlayerDB", 2);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("metadata")) {
          const store = db.createObjectStore("metadata", { keyPath: "path" });
          store.createIndex("timestamp", "timestamp");
        }
        // Add store for album art blobs
        if (!db.objectStoreNames.contains("albumArt")) {
          db.createObjectStore("albumArt", { keyPath: "path" });
        }
      };
    });
  };

  // Save metadata and album art to IndexedDB
  const saveMetadataToCache = async (filePath, metadata, albumArtBlob) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(["metadata", "albumArt"], "readwrite");

      // Save metadata
      const metadataStore = transaction.objectStore("metadata");
      await metadataStore.put({
        path: filePath,
        metadata,
        timestamp: Date.now(),
        fileSize: metadata.size,
      });

      // Save album art if exists
      if (albumArtBlob) {
        const albumArtStore = transaction.objectStore("albumArt");
        await albumArtStore.put({
          path: filePath,
          blob: albumArtBlob,
          timestamp: Date.now(),
        });
      }

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  };

  // Get metadata and album art from IndexedDB
  const getMetadataFromCache = async (filePath, fileSize) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(["metadata", "albumArt"], "readonly");
      const metadataStore = transaction.objectStore("metadata");
      const albumArtStore = transaction.objectStore("albumArt");

      const [metadata, albumArt] = await Promise.all([
        new Promise((resolve) => {
          const request = metadataStore.get(filePath);
          request.onsuccess = () => resolve(request.result);
        }),
        new Promise((resolve) => {
          const request = albumArtStore.get(filePath);
          request.onsuccess = () => resolve(request.result);
        }),
      ]);

      // Check if metadata is still valid
      if (
        !metadata ||
        Date.now() - metadata.timestamp > 7 * 24 * 60 * 60 * 1000 ||
        metadata.fileSize !== fileSize
      ) {
        return null;
      }

      return {
        metadata: metadata.metadata,
        albumArtBlob: albumArt?.blob || null,
      };
    } catch (error) {
      console.error("Error reading from cache:", error);
      return null;
    }
  };

  // Fetch and parse song metadata
  const fetchSongMetadata = async (musicFiles) => {
    const songData = await Promise.all(
      musicFiles.map(async (file) => {
        try {
          // Try to get metadata and album art from cache first
          const cachedData = await getMetadataFromCache(file.path, file.size);
          if (cachedData) {
            return {
              metadata: cachedData.metadata,
              albumArtBlob: cachedData.albumArtBlob,
            };
          }

          // If not in cache, fetch and parse metadata
          const url = convertFileSrc(file.path);
          const response = await fetch(url);

          if (!response.ok) {
            console.error("Fetch failed with status:", response.status);
            return { metadata: null, albumArtBlob: null };
          }

          const blob = await response.blob();
          const metadata = await parseBlob(blob);

          // Handle album art
          let albumArtBlob = null;
          if (metadata.common.picture && metadata.common.picture[0]) {
            const picture = metadata.common.picture[0];
            albumArtBlob = new Blob([picture.data], {
              type: picture.format || "image/jpeg",
            });
          }

          // Save both metadata and album art to cache
          await saveMetadataToCache(file.path, metadata.common, albumArtBlob);

          return { metadata: metadata.common, albumArtBlob };
        } catch (error) {
          console.error("Error processing file:", file.path, error);
          return { metadata: null, albumArtBlob: null };
        }
      })
    );

    // Create object URLs for album art blobs
    const metadataList = songData.map((data) => data.metadata).filter(Boolean);
    const albumArtList = songData.map((data) => {
      if (data.albumArtBlob instanceof Blob) {
        return URL.createObjectURL(data.albumArtBlob);
      }
      return artDefault;
    });

    setSongMetadata(metadataList);
    setAlbumArtList(albumArtList);
  };

  // Cleanup URLs when component unmounts
  useEffect(() => {
    return () => {
      if (albumArt !== artDefault) {
        URL.revokeObjectURL(albumArt);
      }
    };
  }, [albumArt]);

  // Play music
  const playMusic = async (index, firstPlay = true) => {
    const actualIndex = isShuffle ? shuffledIndices[index] : index;
    const fileToPlay = musicFiles[actualIndex];
    const url = convertFileSrc(fileToPlay.path);

    if (currentSound) {
      currentSound.stop();
    }

    const currentTrackTitle = fileToPlay.name.replace(/\.mp3$/i, "");
    setTrackTitle(currentTrackTitle);

    try {
      const songData = await getMetadataFromCache(
        fileToPlay.path,
        fileToPlay.size
      );
      if (songData) {
        setTags(songData.metadata);
        if (songData.albumArtBlob instanceof Blob) {
          const albumArtUrl = URL.createObjectURL(songData.albumArtBlob);
          setAlbumArt(albumArtUrl);
        } else {
          setAlbumArt(artDefault);
        }
      } else {
        // If not in cache, fetch and parse metadata
        const response = await fetch(url);
        const blob = await response.blob();
        const metadata = await parseBlob(blob);
        setTags(metadata.common);

        let albumArtBlob = null;
        if (metadata.common.picture && metadata.common.picture[0]) {
          const picture = metadata.common.picture[0];
          albumArtBlob = new Blob([picture.data], {
            type: picture.format || "image/jpeg",
          });
          const albumArtUrl = URL.createObjectURL(albumArtBlob);
          setAlbumArt(albumArtUrl);
        } else {
          setAlbumArt(artDefault);
        }

        await saveMetadataToCache(
          fileToPlay.path,
          metadata.common,
          albumArtBlob
        );
      }
    } catch (error) {
      console.error("Error fetching the file:", error);
      setAlbumArt(artDefault);
    }

    // Play the track
    const sound = new Howl({
      src: [url],
      format: ["mp3", "wav"],
      autoplay: firstPlay,
      loop: false,
      html5: true,
      volume: volume,
      onplay: () => {
        setIsPlaying(true);
        setCurrentTrack(url);
        setCurrentTrackIndex(index);
        setDuration(sound.duration());
      },
      onend: () => {
        const currentIndex = currentTrackIndexRef.current;
        const shouldLoop = isLoopingSingleRef.current;

        if (shouldLoop) {
          sound.seek(0);
          sound.play();
        } else {
          const nextIndex = getNextTrackIndex(currentIndex);
          playMusic(nextIndex);
        }
      },
      onpause: () => {
        setIsPlaying(false);
      },
      onloaderror: () => {
        const nextIndex = getNextTrackIndex(index);
        playMusic(nextIndex);
      },
    });

    setCurrentTrackIndex(actualIndex);
    setCurrentSound(sound);

    playerStateRef.current = {
      isLoopingSingle,
      currentTrackIndex: actualIndex,
      currentSound: sound,
    };
  };

  // Add cleanup effect for album art URLs
  useEffect(() => {
    return () => {
      // Cleanup existing albumArtList URLs
      albumArtList.forEach((url) => {
        if (url !== artDefault) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [albumArtList]);

  // Toggle play on track click
  const togglePlay = (index) => {
    const playIndex = isShuffle ? getPlayIndex(index) : index;
    playMusic(playIndex);
  };

  // Toggle repeat single track
  const toggleRepeatSingle = () => {
    setIsLoopingSingle((prev) => !prev);
  };

  // Toggle shuffle
  const toggleShuffle = () => {
    const currentShuffleState = isShuffleRef.current;

    if (!currentShuffleState) {
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

    // Update state and ref
    setIsShuffle((prev) => !prev);
    isShuffleRef.current = !currentShuffleState; // Update the ref directly
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (currentSound) {
      if (isPlaying) {
        currentSound.pause();
      } else {
        currentSound.play();
      }
    }
  };

  // Stop music
  const stopMusic = () => {
    if (currentSound) {
      currentSound.stop();
      setCurrentTrack(null);
      setIsPlaying(false);
    }
  };

  // Handle volume change
  const handleVolumeChange = (e) => {
    if (isMuted) {
      toggleMute();
      setIsMuted(false);
    }
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted((prev) => !prev);
    if (currentSound) {
      currentSound.mute(!isMuted);
    }
  };

  // Handle progress change
  const handleProgressChange = (e) => {
    const progress = parseFloat(e.target.value);
    const newTime = (progress / 100) * currentSound.duration();
    currentSound.seek(newTime);
  };

  // Format time in minutes and seconds
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  };

  // Play next track
  const toggleNextTrack = () => {
    playMusic(getNextTrackIndex(currentTrackIndex), isPlaying ? true : false);
  };

  // Play previous track
  const togglePrevTrack = () => {
    playMusic(getPrevTrackIndex(currentTrackIndex), isPlaying ? true : false);
  };

  useEffect(() => {
    const handleWheel = (event) => {
      event.preventDefault();
      const delta = Math.sign(event.deltaY);
      setVolume((prevVolume) => {
        let newVolume = prevVolume - delta * 0.05; // Adjust the step size as needed
        if (newVolume < 0) newVolume = 0;
        if (newVolume > 1) newVolume = 1;
        return newVolume;
      });
    };

    const volumeSlider = volumeSliderRef.current;
    if (volumeSlider) {
      volumeSlider.addEventListener("wheel", handleWheel);
    }

    return () => {
      if (volumeSlider) {
        volumeSlider.removeEventListener("wheel", handleWheel);
      }
    };
  }, []);

  return (
    <div className="flex w-full text-white rounded-3xl justify-between overflow-hidden relative">
      {/* Foreground Content */}
      <div className="relative z-10 flex w-full justify-between items-center">
        {/* Volume */}
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

          <div className="bg-white/10 shadow-2xl p-2 rounded-3xl">
            <VolumeSlider
              value={volume}
              onChange={handleVolumeChange}
              isMuted={isMuted}
              volumeSliderRef={volumeSliderRef}
            />
          </div>
        </div>

        {/* Music Player */}
        <div className="flex flex-col w-full mx-2">
          <div className="flex items-center justify-between">
            {/* Track Information */}
            <div className="p-4 h-[101px] flex flex-col justify-center">
              <div className="relative max-w-[315px] overflow-hidden">
                <div className="text-lg w-[215px] font-semibold text-white whitespace-nowrap truncate">
                  {tags?.title || trackTitle || "No Track Loaded"}
                </div>
              </div>
              <h3 className="text-sm text-gray-400 whitespace-nowrap truncate">
                {tags?.artist || "Unknown Artist"}
              </h3>
            </div>
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

          {/* Music Menu */}
          {musicMenu && (
            <MusicMenuModal
              musicFiles={musicFiles}
              currentTrack={currentTrack}
              togglePlay={togglePlay}
              setMusicMenu={setMusicMenu}
              musicMenu={musicMenu}
              tags={tags}
              albumArt={albumArt}
              albumArtList={albumArtList}
              metadata={songMetadata}
              setIsPlaying={setIsPlaying}
              isPlaying={isPlaying}
              toggleNextTrack={toggleNextTrack}
              togglePrevTrack={togglePrevTrack}
              togglePlayPause={togglePlayPause}
              toggleRepeatSingle={toggleRepeatSingle}
              toggleShuffle={toggleShuffle}
              isLoopingSingle={isLoopingSingle}
              isShuffle={isShuffle}
            />
          )}

          {/* Music Player Controls */}
          <div className="flex flex-col items-center gap-2 p-3 rounded-3xl bg-gray-950/30 mx-2">
            <div className="flex gap-2">
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

            {/* Progress Bar */}
            <div className="flex flex-col gap-1">
              <ProgressBar
                value={(currentTime / duration) * 100 || 0}
                onChange={handleProgressChange}
              />

              {/* Time */}
              <div className="flex text-[10px] text-white/40 justify-between">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Album Art */}
        <img
          onError={() => setAlbumArt(artDefault)}
          src={albumArt}
          className="relative z-10 h-[227px] rounded-3xl w-[227px]"
          alt="Album Art"
        />
      </div>
    </div>
  );
};

export default MusicPlayer;
