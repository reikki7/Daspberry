import React, { useState, useEffect, useRef } from "react";
import { readDir, BaseDirectory, readBinaryFile } from "@tauri-apps/api/fs";
import { homeDir } from "@tauri-apps/api/path";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faPause,
  faVolumeUp,
  faVolumeOff,
  faForward,
  faBackward,
} from "@fortawesome/free-solid-svg-icons";
import jsmediatags from "jsmediatags/dist/jsmediatags.min.js";
import artDefault from "../assets/art-default.jpg";

import VolumeSlider from "./VolumeSlider";
import ProgressBar from "./Progressbar";

function formatTime(time) {
  return [Math.floor(time / 60), Math.floor(time % 60)]
    .map((num) => String(num).padStart(2, "0"))
    .join(":");
}

const MusicPlayer = () => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [coverArt, setCoverArt] = useState(artDefault);
  const [tracks, setTracks] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentTrackTitle, setCurrentTrackTitle] =
    useState("No track selected");
  const [currentTrackArtist, setCurrentTrackArtist] =
    useState("Unknown artist");
  const [shouldScroll, setShouldScroll] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    const titleElement = titleRef.current;
    if (titleElement) {
      setShouldScroll(titleElement.scrollWidth > titleElement.clientWidth);
    }
  }, [currentTrackTitle]);

  useEffect(() => {
    loadMusicFiles();

    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener("loadedmetadata", handleLoadMetadata);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleTrackEnd);
    }

    return () => {
      if (audio) {
        audio.removeEventListener("loadedmetadata", handleLoadMetadata);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleTrackEnd);
      }
    };
  }, []);

  useEffect(() => {
    if (tracks.length > 0 && currentTrackIndex < tracks.length) {
      loadTrackMetadata();
    }
  }, [currentTrackIndex, tracks]);

  const loadMusicFiles = async () => {
    try {
      const userHome = await homeDir();
      const musicPath = `${userHome}Music`;

      const entries = await readDir(musicPath, { recursive: true });
      const musicFiles = entries.filter((entry) => {
        const ext = entry.path.toLowerCase();
        return (
          ext.endsWith(".mp3") || ext.endsWith(".wav") || ext.endsWith(".m4a")
        );
      });

      const formattedTracks = musicFiles.map((file) => ({
        path: file.path,
        name: file.name || file.path.split("\\").pop().split("/").pop(),
      }));

      setTracks(formattedTracks);

      if (formattedTracks.length > 0) {
        setCurrentTrackTitle(formattedTracks[0].name);
      }
    } catch (error) {
      console.error("Error loading music files:", error);
    }
  };

  const loadTrackMetadata = async () => {
    const currentTrack = tracks[currentTrackIndex];
    if (!currentTrack) return;

    // Remove .mp3 extension from the track title
    const trackTitle = currentTrack.name.replace(/\.mp3$/i, "");
    setCurrentTrackTitle(trackTitle);

    try {
      const fileData = await readBinaryFile(currentTrack.path);
      const blob = new Blob([new Uint8Array(fileData)], { type: "audio/mpeg" });
      const objectUrl = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.src = objectUrl;
        audioRef.current.load();

        if (isPlaying) {
          audioRef.current.play();
        }

        // Try to read metadata if it's an MP3 file
        if (currentTrack.path.toLowerCase().endsWith(".mp3")) {
          jsmediatags.read(blob, {
            onSuccess: function (tag) {
              if (tag.tags.picture) {
                const { data, format } = tag.tags.picture;
                const base64String = data
                  .map((byte) => String.fromCharCode(byte))
                  .join("");
                const imageUrl = `data:${format};base64,${btoa(base64String)}`;
                setCoverArt(imageUrl);
                setCurrentTrackTitle(tag.tags.title || trackTitle);
                setCurrentTrackArtist(tag.tags.artist || "Unknown artist");
                console.log(tag);
              }
            },
            onError: function (error) {
              console.log("Error reading tags:", error);
              setCoverArt(artDefault);
            },
          });
        }
      }
    } catch (error) {
      console.error("Error loading track metadata:", error);
      setCoverArt(artDefault);
    }
  };

  // Remove .mp3 extension from the track title
  useEffect(() => {
    if (currentTrackTitle) {
      const trackTitle = currentTrackTitle.replace(/\.mp3$/i, "");
      setCurrentTrackTitle(trackTitle);
    }
  }, [currentTrackTitle]);

  const handleLoadMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleTrackEnd = () => {
    playNextTrack();
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMute = () => {
    if (audioRef.current) {
      setIsMuted(!isMuted);
      audioRef.current.volume = isMuted ? volume : 0;
    }
  };

  const handleVolumeChange = (value) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
      setIsMuted(value === 0);
    }
  };

  const handleProgressChange = (e) => {
    const newTime = (e.target.value / 100) * duration;
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const playTrack = async (index) => {
    if (index >= 0 && index < tracks.length) {
      setCurrentTrackIndex(index);
      audioRef.current.src = tracks[index].path;
      await audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const playNextTrack = () => {
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    playTrack(nextIndex);
  };

  const playPreviousTrack = () => {
    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrack(prevIndex);
  };

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
        {/* Track Information */}
        <div className="p-4">
          <div className="relative w-[315px] overflow-hidden">
            <div
              ref={titleRef}
              className={`text-lg font-semibold text-white whitespace-nowrap ${
                shouldScroll ? "animate-scroll" : "truncate"
              }`}
              style={{
                transform: "translateX(0)",
                animation: shouldScroll ? "scroll 15s linear infinite" : "none",
              }}
            >
              {currentTrackTitle}
            </div>
          </div>
          <h3 className="text-sm text-gray-400">{currentTrackArtist}</h3>
        </div>

        {/* Music Player Controls */}
        <div className="flex flex-col items-center gap-2 p-3 rounded-3xl bg-gray-950/30 mx-3">
          <div className="flex gap-2">
            <button
              onClick={playPreviousTrack}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-gray-950/30 duration-200"
            >
              <FontAwesomeIcon icon={faBackward} />
            </button>
            <button
              onClick={handlePlayPause}
              className="w-10 h-10 rounded-full text-white hover:bg-gray-950/30 duration-200"
            >
              <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
            </button>
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
