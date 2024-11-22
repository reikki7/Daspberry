import React, { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { readBinaryFile } from "@tauri-apps/api/fs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faPause,
  faVolumeUp,
  faVolumeOff,
  faForward,
  faBackward,
  faList,
  faXmark,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import jsmediatags from "jsmediatags/dist/jsmediatags.min.js";
import artDefault from "../assets/art-default.jpg";
import ProgressBar from "./ProgressBar";
import VolumeSlider from "./VolumeSlider";
import MiniMusicMenu from "./MiniMusicMenu";

function formatTime(time) {
  return [Math.floor(time / 60), Math.floor(time % 60)]
    .map((num) => String(num).padStart(2, "0"))
    .join(":");
}

const MusicPlayer = () => {
  // Core audio states
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.2);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Track management states
  const [tracks, setTracks] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [loadedMetadata, setLoadedMetadata] = useState(new Map());
  const [pendingMetadata, setPendingMetadata] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef(null);
  const currentAudioUrl = useRef(null);
  const loadingTrack = useRef(false);

  // UI states
  const [coverArt, setCoverArt] = useState(artDefault);
  const [currentTrackTitle, setCurrentTrackTitle] =
    useState("No track selected");
  const [currentTrackArtist, setCurrentTrackArtist] =
    useState("Unknown artist");
  const [shouldScroll, setShouldScroll] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const titleRef = useRef(null);

  // Batch metadata loading state
  const metadataLoadingBatch = useRef(new Set());
  const batchTimeoutRef = useRef(null);

  // Initialize music library
  useEffect(() => {
    scanMusicLibrary();
    initializeAudioListeners();
    return cleanupAudioListeners;
  }, []);

  const scanMusicLibrary = async () => {
    try {
      const scannedTracks = await invoke("scan_music_directory");
      setTracks(scannedTracks);
      if (scannedTracks.length > 0) {
        setCurrentTrackTitle(scannedTracks[0].name.replace(/\.mp3$/i, ""));
      }
    } catch (error) {
      console.error("Error scanning music library:", error);
    }
  };

  const initializeAudioListeners = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener("loadedmetadata", handleLoadMetadata);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleTrackEnd);
    }
  };

  const cleanupAudioListeners = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.removeEventListener("loadedmetadata", handleLoadMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleTrackEnd);
    }
  };

  // Metadata loading optimization
  const loadTrackMetadata = useCallback(
    async (trackPath) => {
      if (loadedMetadata.has(trackPath) || pendingMetadata.has(trackPath)) {
        return;
      }

      setPendingMetadata((prev) => new Set([...prev, trackPath]));

      try {
        const fileData = await readBinaryFile(trackPath);
        const blob = new Blob([new Uint8Array(fileData)], {
          type: "audio/mpeg",
        });

        return new Promise((resolve, reject) => {
          jsmediatags.read(blob, {
            onSuccess: (tag) => {
              const metadata = {
                title:
                  tag.tags.title ||
                  trackPath
                    .split("/")
                    .pop()
                    .replace(/\.mp3$/i, ""),
                artist: tag.tags.artist || "Unknown artist",
                coverArt: null,
              };

              if (tag.tags.picture) {
                const { data, format } = tag.tags.picture;
                const base64String = data
                  .map((byte) => String.fromCharCode(byte))
                  .join("");
                metadata.coverArt = `data:${format};base64,${btoa(
                  base64String
                )}`;
              }

              setLoadedMetadata(
                (prev) => new Map([...prev, [trackPath, metadata]])
              );
              setPendingMetadata((prev) => {
                const next = new Set(prev);
                next.delete(trackPath);
                return next;
              });
              resolve(metadata);
            },
            onError: (error) => {
              console.error("Error reading tags:", error);
              setPendingMetadata((prev) => {
                const next = new Set(prev);
                next.delete(trackPath);
                return next;
              });
              reject(error);
            },
          });
        });
      } catch (error) {
        console.error("Error loading track metadata:", error);
        setPendingMetadata((prev) => {
          const next = new Set(prev);
          next.delete(trackPath);
          return next;
        });
      }
    },
    [loadedMetadata]
  );

  // Batch metadata loading
  const queueMetadataLoad = useCallback(
    (trackPath) => {
      metadataLoadingBatch.current.add(trackPath);

      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      batchTimeoutRef.current = setTimeout(() => {
        const batchPaths = Array.from(metadataLoadingBatch.current);
        metadataLoadingBatch.current.clear();

        batchPaths.forEach((path) => {
          loadTrackMetadata(path);
        });
      }, 100);
    },
    [loadTrackMetadata]
  );

  // Audio control handlers
  const handlePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleMute = useCallback(() => {
    if (audioRef.current) {
      setIsMuted(!isMuted);
      audioRef.current.volume = isMuted ? volume : 0;
    }
  }, [isMuted, volume]);

  const handleVolumeChange = useCallback((value) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
      setIsMuted(value === 0);
    }
  }, []);

  const handleProgressChange = useCallback(
    (e) => {
      const newTime = (e.target.value / 100) * duration;
      setCurrentTime(newTime);
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
      }
    },
    [duration]
  );

  const handleLoadMetadata = useCallback(() => {
    setDuration(audioRef.current.duration);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    setCurrentTime(audioRef.current.currentTime);
  }, []);

  // Track playback
  const playTrack = useCallback(
    async (index) => {
      if (index < 0 || index >= tracks.length || loadingTrack.current) {
        return;
      }

      // Cancel any ongoing track load
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      loadingTrack.current = true;
      setIsLoading(true);
      const track = tracks[index];

      try {
        // Clean up previous audio URL
        if (currentAudioUrl.current) {
          URL.revokeObjectURL(currentAudioUrl.current);
          currentAudioUrl.current = null;
        }

        // Stop current playback
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }

        setCurrentTrackIndex(index);

        // Load metadata first (do this in parallel with audio loading)
        const metadataPromise = loadedMetadata.has(track.path)
          ? Promise.resolve(loadedMetadata.get(track.path))
          : loadTrackMetadata(track.path);

        // Start loading the audio file
        const fileData = await readBinaryFile(track.path);
        const blob = new Blob([new Uint8Array(fileData)], {
          type: "audio/mpeg",
        });
        const url = URL.createObjectURL(blob);
        currentAudioUrl.current = url;

        // Update metadata once available
        const metadata = await metadataPromise;
        if (metadata) {
          setCurrentTrackTitle(metadata.title);
          setCurrentTrackArtist(metadata.artist);
          setCoverArt(metadata.coverArt || artDefault);
        }

        // Play the audio
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.volume = isMuted ? 0 : volume;

          // Only auto-play if this was triggered by user action
          if (document.body.hasAttribute("data-user-initiated")) {
            await audioRef.current.play();
            setIsPlaying(true);
            document.body.removeAttribute("data-user-initiated");
          }
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error playing track:", error);
        }
      } finally {
        loadingTrack.current = false;
        setIsLoading(false);
      }
    },
    [tracks, loadedMetadata, loadTrackMetadata, volume, isMuted]
  );

  const playNextTrack = useCallback(() => {
    document.body.setAttribute("data-user-initiated", "true");
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    playTrack(nextIndex);
  }, [currentTrackIndex, tracks.length, playTrack]);

  const playPreviousTrack = useCallback(() => {
    document.body.setAttribute("data-user-initiated", "true");
    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrack(prevIndex);
  }, [currentTrackIndex, tracks.length, playTrack]);

  const handleTrackEnd = useCallback(() => {
    playNextTrack();
  }, [playNextTrack]);

  // Modified button rendering with loading state
  const renderPlayPauseButton = () => (
    <button
      onClick={handlePlayPause}
      disabled={isLoading}
      className={`w-10 h-10 rounded-full text-white hover:bg-gray-950/30 duration-200 
        ${isLoading ? "opacity-50 cursor-wait" : ""}`}
    >
      {isLoading ? (
        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
      ) : (
        <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
      )}
    </button>
  );

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (currentAudioUrl.current) {
        URL.revokeObjectURL(currentAudioUrl.current);
      }
    };
  }, []);

  // UI handlers
  const toggleMenu = useCallback(() => {
    setShowMenu((prev) => !prev);
  }, []);

  // Title scroll effect
  useEffect(() => {
    const titleElement = titleRef.current;
    if (titleElement) {
      setShouldScroll(titleElement.scrollWidth > titleElement.clientWidth);
    }
  }, [currentTrackTitle]);

  // Track title cleanup
  useEffect(() => {
    if (currentTrackTitle) {
      const trackTitle = currentTrackTitle.replace(/\.mp3$/i, "");
      setCurrentTrackTitle(trackTitle);
    }
  }, [currentTrackTitle]);

  // Preload metadata for neighboring tracks
  useEffect(() => {
    const preloadRange = 3; // Number of tracks to preload before and after
    const start = Math.max(0, currentTrackIndex - preloadRange);
    const end = Math.min(tracks.length, currentTrackIndex + preloadRange + 1);

    for (let i = start; i < end; i++) {
      if (tracks[i]) {
        queueMetadataLoad(tracks[i].path);
      }
    }
  }, [currentTrackIndex, tracks, queueMetadataLoad]);

  return (
    <div className="flex w-full text-white rounded-3xl justify-between overflow-hidden">
      <audio ref={audioRef} />

      {/* Volume */}
      <div className="flex flex-col items-center px-3 pl-4 justify-center gap-2">
        <button
          onClick={handleMute}
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
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            isMuted={isMuted}
          />
        </div>
      </div>

      {/* Music Player */}
      <div className="flex flex-col w-full bg-gray-950/10 rounded-3xl mx-2">
        <div className="flex p-4 max-w-64">
          {/* Track Information */}
          <div>
            <div className="relative w-[285px] overflow-hidden">
              <div
                ref={titleRef}
                className={`text-lg font-semibold text-white whitespace-nowrap ${
                  shouldScroll ? "animate-scroll" : "truncate"
                }`}
                style={{
                  transform: "translateX(0)",
                  animation: shouldScroll
                    ? "scroll 15s linear infinite"
                    : "none",
                }}
              >
                {currentTrackTitle}
              </div>
            </div>
            <h3 className="text-sm text-gray-400">{currentTrackArtist}</h3>
          </div>
          <button
            onClick={toggleMenu}
            className="w-8 hover:opacity-75 duration-300 p-4 h-8 flex items-center justify-center rounded-full bg-gray-950/40 text-white"
          >
            <FontAwesomeIcon icon={faList} />
          </button>
        </div>

        {/* Menu */}
        <MiniMusicMenu
          showMenu={showMenu}
          toggleMenu={toggleMenu}
          currentTrackIndex={currentTrackIndex}
          playTrack={playTrack}
        />

        {/* Music Player Controls */}
        <div className="flex flex-col items-center gap-2 p-3 rounded-3xl bg-gray-950/30 mx-3">
          <div className="flex gap-2">
            <button
              onClick={playPreviousTrack}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-gray-950/30 duration-200"
            >
              <FontAwesomeIcon icon={faBackward} />
            </button>
            {renderPlayPauseButton()}
            <button
              onClick={playNextTrack}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-gray-950/30 duration-200"
            >
              <FontAwesomeIcon icon={faForward} />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <ProgressBar
              value={(currentTime / duration) * 100 || 0}
              onChange={handleProgressChange}
            />
            <div className="flex text-xs text-white justify-between">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
      <img src={coverArt} className="h-56 rounded-3xl w-56" />

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
