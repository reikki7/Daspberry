import { useState, useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import artDefault from "../assets/art-default.jpg";
import {
  faCompactDisc,
  faPlay,
  faPause,
  faForward,
  faBackward,
  faShuffle,
  faRepeat,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const MusicMenuModal = ({
  musicFiles = [],
  currentTrack,
  togglePlay,
  setMusicMenu,
  musicMenu,
  tags,
  albumArt,
  albumArtList,
  metadata,
  setIsPlaying,
  isPlaying,
  toggleNextTrack,
  togglePrevTrack,
  togglePlayPause,
  toggleShuffle,
  toggleRepeatSingle,
  isShuffle,
  isLoopingSingle,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isUsingArrowKeys, setIsUsingArrowKeys] = useState(false);

  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const searchInputRef = useRef(null);
  const keyHeldDown = useRef(false);

  itemRefs.current = [];

  const currentFile = musicFiles.find(
    (musicFile) => convertFileSrc(musicFile.path) === currentTrack
  );

  const filteredMusic = musicFiles.filter((file, index) => {
    const meta = metadata[index];
    if (!meta) return false;

    const searchLower = searchTerm.toLowerCase();

    // Search through title
    const titleMatch = (meta.title || file.name.replace(/\.mp3$/i, ""))
      .toLowerCase()
      .includes(searchLower);

    // Search through artists array if it exists
    const artistMatch = meta.artists
      ? meta.artists.some((artist) =>
          artist.toLowerCase().includes(searchLower)
        )
      : // Search through artist if artists array doesn't exist
      meta.artist
      ? meta.artist.toLowerCase().includes(searchLower)
      : false;

    return titleMatch || artistMatch;
  });

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setMusicMenu(false);
      setIsUsingArrowKeys(false);
    }
  };

  useEffect(() => {
    if (focusedIndex < 0) {
      setFocusedIndex(0);
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        document.activeElement.blur();
        setMusicMenu(false);
      }

      if (e.key === "/") {
        e.preventDefault();
        document.activeElement.blur();
        setIsSearchFocused(true);
        searchInputRef.current.focus();
        setFocusedIndex(0);
      }

      if (
        document.activeElement.tagName === "INPUT" &&
        ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(e.key)
      ) {
        document.activeElement.blur();
        setIsSearchFocused(false);
        setIsUsingArrowKeys(true);
        return;
      }

      if (isSearchFocused) return;

      if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setIsUsingArrowKeys(true);

        if (e.key === "ArrowUp") {
          if (focusedIndex !== 0) {
            setFocusedIndex((prevIndex) =>
              prevIndex === 0
                ? filteredMusic.length - 1
                : prevIndex === 1
                ? filteredMusic.length - 2
                : prevIndex - 2
            );
          } else if (!keyHeldDown.current) {
            setFocusedIndex(filteredMusic.length - 1);
          }
        } else if (e.key === "ArrowDown") {
          if (focusedIndex < filteredMusic.length - 1) {
            setFocusedIndex((prevIndex) =>
              prevIndex === 0 && !isUsingArrowKeys
                ? 0
                : prevIndex === filteredMusic.length - 1
                ? 0
                : prevIndex + 2
            );
          } else if (!keyHeldDown.current) {
            setFocusedIndex(0);
          }
        } else if (e.key === "ArrowRight") {
          setFocusedIndex((prevIndex) =>
            prevIndex === 0 && !isUsingArrowKeys
              ? 0
              : prevIndex === filteredMusic.length - 1
              ? 0
              : prevIndex + 1
          );
        } else if (e.key === "ArrowLeft") {
          setFocusedIndex((prevIndex) =>
            prevIndex === 0 && !isUsingArrowKeys
              ? 0
              : prevIndex === 0
              ? filteredMusic.length - 1
              : prevIndex - 1
          );
        }

        keyHeldDown.current = true;
      } else if (e.key === "Enter" && musicMenu) {
        e.preventDefault();
        const selectedFile = filteredMusic[focusedIndex];
        const originalIndex = musicFiles.findIndex(
          (musicFile) => musicFile.path === selectedFile.path
        );
        togglePlay(originalIndex);
        setIsUsingArrowKeys(false);
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlayPause();
        setIsPlaying(!isPlaying);
      }
    };

    const handleKeyUp = (e) => {
      if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        keyHeldDown.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    focusedIndex,
    filteredMusic,
    musicFiles,
    togglePlay,
    togglePlayPause,
    setIsPlaying,
    isPlaying,
    setMusicMenu,
    isSearchFocused,
  ]);

  useEffect(() => {
    if (focusedIndex >= filteredMusic.length) {
      setFocusedIndex(filteredMusic.length - 1);
    }
  }, [filteredMusic, focusedIndex]);

  useEffect(() => {
    if (itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex].scrollIntoView({
        behavior: "instant",
        block: "nearest",
      });
    }
  }, [focusedIndex]);

  return (
    <div
      className="fixed inset-0 bg-black/60 rounded-3xl backdrop-blur-sm flex items-center justify-center z-[200]"
      onClick={handleOverlayClick}
    >
      <div className="relative w-[800px] h-[800px] bg-black/70 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className="sticky top-0 border-b border-white/10 z-10"
          data-tauri-drag-region
        >
          <div
            className="flex items-center justify-between p-4"
            data-tauri-drag-region
          >
            <div className="flex items-center gap-3 ml-1">
              <FontAwesomeIcon
                icon={faCompactDisc}
                className={`text-white text-2xl ${
                  isPlaying ? "animate-spin" : ""
                }`}
              />
              <h2 className="text-lg font-semibold text-white">
                Music Library
              </h2>
            </div>
            <button
              onClick={() => setMusicMenu(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/60 hover:text-white duration-200"
            >
              ✕
            </button>
          </div>

          {currentTrack && (
            <div
              className={`relative flex items-center gap-4 p-4 pl-6  overflow-hidden ${
                albumArt !== "/src/assets/art-default.jpg"
                  ? "bg-black/5"
                  : "bg-white/5"
              }`}
            >
              {albumArt !== "/src/assets/art-default.jpg" && (
                <div
                  className="absolute inset-0 bg-cover bg-no-repeat"
                  onError={(e) => (e.target.className = "bg-white/5")}
                  style={{
                    backgroundImage: `url(${albumArt})`,
                    backgroundPositionY: "40%",
                    filter: "blur(12px)",
                    opacity: 0.3,
                    zIndex: -1,
                  }}
                />
              )}
              <img
                src={albumArt || artDefault}
                onError={(e) => (e.target.src = artDefault)}
                alt="Album Art"
                className="w-28 h-28 object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-white/40 italic">
                  Now playing...
                </p>
                <h3 className="text-white font-medium truncate">
                  {tags?.title ||
                    currentFile?.name.replace(/\.mp3$/i, "") ||
                    "Unknown Title"}
                </h3>
                {tags?.artists ? (
                  <>
                    {tags.artists.slice(0, 3).map((artist, index) => (
                      <p key={index} className="text-white/60 text-xs truncate">
                        {artist}
                      </p>
                    ))}
                    {tags.artists.length > 3 && (
                      <p className="text-white/60 text-xs truncate">...</p>
                    )}
                  </>
                ) : (
                  <p className="text-white/60 text-xs truncate">
                    {tags?.artist || "Unknown Artist"}
                  </p>
                )}
              </div>

              {/* Music Player Controls */}
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
            </div>
          )}

          {/* Search Bar */}
          <div className="p-3">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by title, artist, or album..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
                onFocus={() => {
                  setIsSearchFocused(true);
                  setIsUsingArrowKeys(false);
                  setFocusedIndex(0);
                }}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-white/40 focus:outline-none"
              />

              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Music List */}
        <div
          ref={listRef}
          className={`p-2 overflow-y-auto custom-scrollbar ${
            currentTrack ? "h-[523px]" : "h-[667px]"
          } `}
          role="listbox"
          aria-activedescendant={`song-${focusedIndex}`}
        >
          <div className="grid grid-cols-2 gap-1">
            {filteredMusic.map((file, index) => {
              const originalIndex = musicFiles.findIndex(
                (musicFile) => musicFile.path === file.path
              );
              const isFocused = isUsingArrowKeys && index === focusedIndex;
              itemRefs.current[index] = itemRefs.current[index] || null;
              return (
                <button
                  ref={(el) => (itemRefs.current[index] = el)}
                  id={`song-${index}`}
                  key={index}
                  onClick={() => {
                    togglePlay(originalIndex);
                    setIsUsingArrowKeys(false); // Clear highlight on click
                  }}
                  className={`w-full p-1 flex items-center text-left rounded-xl duration-200 group
                  ${
                    currentTrack === convertFileSrc(file.path)
                      ? `bg-white/20 ${
                          isFocused ? "text-white/60" : "text-white"
                        }`
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  }
                  ${isFocused ? "bg-white/10 text-white" : ""}`}
                  role="option"
                  aria-selected={isFocused}
                >
                  {/* Play indicator */}
                  <div className="w-8 h-8 flex items-center justify-center">
                    {currentTrack === convertFileSrc(file.path) ? (
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-white/20 group-hover:bg-white/40 duration-200" />
                    )}
                  </div>

                  {/* Album Art */}
                  <div className="flex items-center p-2">
                    <img
                      src={albumArtList[originalIndex] || artDefault}
                      onError={(e) => (e.target.src = artDefault)}
                      alt="Album Art"
                      className="w-20 h-20 object-cover"
                    />

                    {/* Track Info */}
                    <div className="ml-4 max-w-[230px]">
                      <span className="block text-sm font-semibold truncate">
                        {metadata[originalIndex]?.title ||
                          file?.name.replace(/\.mp3$/i, "") ||
                          "Unknown Title"}
                      </span>
                      <span className="block text-xs text-white/40">
                        {metadata[originalIndex]?.artists ? (
                          <>
                            {metadata[originalIndex]?.artists
                              .slice(0, 2)
                              .map((artist, index) => (
                                <p
                                  key={index}
                                  className="text-white/60 text-xs truncate"
                                >
                                  {artist}
                                </p>
                              ))}
                            {metadata[originalIndex]?.artists.length === 3 && (
                              <p className="text-white/60 text-xs truncate">
                                {metadata[originalIndex]?.artists[2]}
                              </p>
                            )}
                            {metadata[originalIndex]?.artists.length > 3 && (
                              <p className="text-white/60 text-xs truncate">
                                ...
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-white/60 text-xs truncate">
                            {metadata[originalIndex]?.artist ||
                              "Unknown Artist"}
                          </p>
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicMenuModal;
