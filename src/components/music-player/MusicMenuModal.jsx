// MusicMenuModal.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import artDefault from "../../assets/art-default.jpg";
import { faCompactDisc } from "@fortawesome/free-solid-svg-icons";
import { ArrowUpZA, ArrowDownAZ, RefreshCw } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import MusicMenuPlayerControls from "./MusicMenuPlayerControls";

export default function MusicMenuModal({
  musicFiles = [],
  currentTrack,
  togglePlay,
  setMusicMenu,
  musicMenu,
  tags,
  albumArt,
  metadata = {},
  setIsPlaying,
  isPlaying,
  toggleNextTrack,
  togglePrevTrack,
  togglePlayPause,
  toggleShuffle,
  toggleRepeatSingle,
  isShuffle,
  isLoopingSingle,
  loadMusicFiles,
  isLoadingMetadata,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isUsingArrowKeys, setIsUsingArrowKeys] = useState(false);
  const [sortOrder, setSortOrder] = useState("asc");
  const [activeLetters, setActiveLetters] = useState(new Set());

  const scrollContainerRef = useRef(null);
  const itemRefs = useRef([]);
  const searchInputRef = useRef(null);
  const keyHeldDown = useRef(false);

  itemRefs.current = [];

  // For "Now Playing" at top
  const currentFile = useMemo(() => {
    return musicFiles.find(
      (musicFile) => convertFileSrc(musicFile.path) === currentTrack
    );
  }, [musicFiles, currentTrack]);

  // Filter + Sort
  const filteredMusic = useMemo(() => {
    return musicFiles
      .filter((file) => {
        // If we have metadata for this file
        const meta = metadata[file.path];
        if (!meta) return false;

        // Ensure searchTerm and metadata fields are strings
        const searchLower = (searchTerm || "").toLowerCase().trim();
        const title = (meta.title || file.name || "")
          .toString()
          .toLowerCase()
          .trim();
        const artist = (meta.artist || "Unknown Artist")
          .toString()
          .toLowerCase()
          .trim();

        // Match the search term against title and artist
        const titleMatch = title.includes(searchLower);
        const artistMatch = artist.includes(searchLower);

        return titleMatch || artistMatch;
      })
      .sort((a, b) => {
        const normalize = (str) =>
          (str || "").replace(/^[^\p{L}\p{N}]+/u, "").toLowerCase();
        const metaA = normalize(metadata[a.path]?.title || a.name);
        const metaB = normalize(metadata[b.path]?.title || b.name);
        return sortOrder === "asc"
          ? metaA.localeCompare(metaB)
          : metaB.localeCompare(metaA);
      });
  }, [musicFiles, metadata, searchTerm, sortOrder]);

  // 2) Letter positions for the alphabetical scroller
  const letterPositions = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !filteredMusic.length) return new Map();

    const positions = new Map();
    let currentLetter = "";

    filteredMusic.forEach((file, index) => {
      const element = itemRefs.current[index];
      if (!element) return;

      const title = (metadata[file.path]?.title || file.name || "").toString();
      const firstLetter = title.charAt(0).toUpperCase();

      if (firstLetter !== currentLetter) {
        currentLetter = firstLetter;
        try {
          const rect = element.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const relativeTop =
            rect.top - containerRect.top + container.scrollTop;
          positions.set(firstLetter || "#", relativeTop);
        } catch (error) {
          // If there's any error getting positions, skip this letter
          console.debug("Skipping letter position calculation:", error);
        }
      }
    });

    return positions;
  }, [filteredMusic, metadata]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      try {
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        const positions = letterPositions();

        const visibleLetters = new Set();

        positions.forEach((offset, letter) => {
          const nextLetterEntry = Array.from(positions.entries()).find(
            ([_, pos]) => pos > offset
          );
          const nextOffset = nextLetterEntry
            ? nextLetterEntry[1]
            : container.scrollHeight;

          const isVisible =
            (offset >= scrollTop && offset <= scrollTop + containerHeight) ||
            (nextOffset >= scrollTop &&
              nextOffset <= scrollTop + containerHeight) ||
            (offset <= scrollTop && nextOffset >= scrollTop + containerHeight);

          if (isVisible) {
            visibleLetters.add(letter);
          }
        });

        setActiveLetters(
          new Set(
            Array.from(visibleLetters).map((letter) => {
              if (/[A-Z]/.test(letter)) {
                return letter; // Keep A-Z as is
              } else if (/[0-9]/.test(letter)) {
                return "0"; // Group all numbers under "0"
              } else {
                return "#"; // Group everything else under "#"
              }
            })
          )
        );
      } catch (error) {
        console.debug("Error during scroll handling:", error);
      }
    });
  }, [letterPositions]);

  // Pre-calculate letter positions
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      // Initial calculation
      handleScroll();
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [filteredMusic, handleScroll]);

  // Generate available letters from filteredMusic
  const letters = useMemo(() => {
    const allLetters = Array.from(
      new Set(
        filteredMusic.map((file) => {
          const title = (
            metadata[file.path]?.title ||
            file.name ||
            ""
          ).toString();
          if (typeof title !== "string") {
            console.warn(`Title for file path "${file.path}" is not a string.`);
            return "#";
          }
          const firstChar = title.charAt(0).toUpperCase();

          if (/[A-Z]/.test(firstChar)) {
            return firstChar; // Keep A-Z as is
          } else if (/[0-9]/.test(firstChar)) {
            return "0"; // Group all numbers under "0"
          } else {
            return "#"; // Group everything else under "#"
          }
        })
      )
    );

    return allLetters.sort((a, b) => {
      if (a === "#") return 1; // Move # to the end
      if (b === "#") return -1;
      return a.localeCompare(b); // Sort alphabetically
    });
  }, [filteredMusic, metadata]);

  const scrollToLetter = (letter) => {
    const index = filteredMusic.findIndex((file) => {
      const metaTitle = (metadata[file.path]?.title || file.name || "").trim();
      const firstChar = metaTitle.charAt(0).toUpperCase();
      if (letter === "#") {
        return /[^A-Z0-9]/.test(firstChar); // Matches non-alphanumeric characters
      } else if (letter === "0") {
        return /[0-9]/.test(firstChar); // Matches numeric characters
      }
      return firstChar === letter; // Matches the specific letter
    });

    if (index >= 0 && itemRefs.current[index]) {
      itemRefs.current[index].scrollIntoView({ behavior: "smooth" });
    }
  };

  // Sorting toggle
  function toggleSortOrder() {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setFocusedIndex((c) => Math.min(c, filteredMusic.length - 1));
  }

  // Closing / overlay click
  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      setMusicMenu(false);
      setIsUsingArrowKeys(false);
    }
  }

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
        if (!isSearchFocused) e.preventDefault();
        document.activeElement.blur();
        setIsSearchFocused(true);
        searchInputRef.current.focus();
        setFocusedIndex(0);
      }

      if (
        document.activeElement.tagName === "INPUT" &&
        ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(e.key)
      ) {
        e.preventDefault();
        document.activeElement.blur();
        setIsSearchFocused(false);
        setIsUsingArrowKeys(true);
        return;
      }

      if (isSearchFocused) return;

      if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();

        if (!isUsingArrowKeys) {
          const playingIndex = filteredMusic.findIndex(
            (file) => convertFileSrc(file.path) === currentTrack
          );
          setFocusedIndex(playingIndex >= 0 ? playingIndex : 0);
        }

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
        if (selectedFile) {
          const originalIndex = musicFiles.findIndex(
            (musicFile) => musicFile.path === selectedFile.path
          );
          if (originalIndex !== -1) {
            togglePlay(originalIndex);
          }
        }
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlayPause();
        setIsPlaying((prevIsPlaying) => !prevIsPlaying);
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
    filteredMusic,
    isPlaying,
    isSearchFocused,
    focusedIndex,
    musicMenu,
    currentTrack,
    togglePlayPause,
    togglePlay,
  ]);

  useEffect(() => {
    // Only adjust focusedIndex if it's out of bounds of the new filtered list
    if (focusedIndex >= filteredMusic.length) {
      setFocusedIndex(Math.max(0, filteredMusic.length - 1));
    }
  }, [filteredMusic.length, focusedIndex]);

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
      <div className="relative w-[800px] h-[850px] bg-black/70 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
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
              onClick={() => {
                setMusicMenu(false);
              }}
              className="w-8 h-8 flex items-center hover:rotate-90 justify-center rounded-full text-white/60 hover:text-white duration-200"
            >
              ✕
            </button>
          </div>

          {/* Now Playing info */}
          {currentTrack && (
            <div
              className={`relative flex items-center gap-4 p-4 pl-6 overflow-hidden ${
                albumArt && albumArt !== artDefault
                  ? "bg-black/5"
                  : "bg-white/5"
              }`}
            >
              {albumArt && albumArt !== artDefault && (
                <div
                  className="absolute inset-0 bg-cover bg-no-repeat"
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
                <p className="text-[10px] animate-pulse text-white/40 italic">
                  Now playing...
                </p>
                <h3 className="text-white font-medium truncate">
                  {tags?.title ||
                    (currentFile?.name
                      ? currentFile.name.replace(/\.mp3$/i, "")
                      : "Unknown Title")}
                </h3>
                <div className="text-white/60 text-xs">
                  {Array.isArray(tags?.artist) && tags.artist.length > 0
                    ? tags.artist
                        .slice(0, 4) // Show up to 4 artists
                        .map((artist, index) =>
                          index === 3 && tags.artist.length > 4 ? (
                            <span key={index}>...</span> // Show "..." if there are more than 4 artists
                          ) : (
                            <span key={index} className="block">
                              {artist}
                            </span>
                          )
                        )
                    : tags?.artist || "Unknown Artist"}
                </div>
              </div>

              {/* In-modal controls */}
              <MusicMenuPlayerControls
                isPlaying={isPlaying}
                isShuffle={isShuffle}
                isLoopingSingle={isLoopingSingle}
                togglePlayPause={togglePlayPause}
                toggleShuffle={toggleShuffle}
                toggleRepeatSingle={toggleRepeatSingle}
                togglePrevTrack={togglePrevTrack}
                toggleNextTrack={toggleNextTrack}
              />
            </div>
          )}

          {/* Search / Sort / Refresh */}
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="relative w-full">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by title or artist..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);

                    // Scroll to the top of the container
                    const container = scrollContainerRef.current;
                    if (container) {
                      container.scrollTo({
                        top: 0,
                        behavior: "auto",
                      });
                    }
                  }}
                  onFocus={() => {
                    e.preventDefault();
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
              {/* Sort order */}
              <button
                onClick={toggleSortOrder}
                className="text-white/60 px-3 hover:text-white duration-200"
                title="Toggle Sort Order"
              >
                {sortOrder === "asc" ? <ArrowDownAZ /> : <ArrowUpZA />}
              </button>
              {/* Manual refresh from Tauri */}
              <button
                onClick={async () => {
                  await loadMusicFiles(true);
                  alert("Music library has been updated!");
                }}
                className="text-white/60 group px-2 hover:text-white duration-200"
                title="Refresh Library"
                disabled={isLoadingMetadata}
              >
                <RefreshCw
                  size={18}
                  className={`${
                    isLoadingMetadata
                      ? "animate-spin"
                      : "group-hover:rotate-180"
                  } duration-300 `}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Main content: music list + alphabetical scroller */}
        <div
          className="flex music-list justify-between items-center"
          tabIndex={-1}
        >
          <div
            ref={scrollContainerRef}
            className={`p-2 overflow-y-auto custom-scrollbar focus:outline-none ${
              currentTrack ? "h-[573px]" : "h-[717px]"
            }`}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={`song-${focusedIndex}`}
          >
            <div className="grid grid-cols-2 gap-1">
              {filteredMusic.map((file, index) => {
                const meta = metadata[file.path] || {};
                const isActive = convertFileSrc(file.path) === currentTrack;
                const isFocused = isUsingArrowKeys && index === focusedIndex;

                // We'll store the ref for scrolling
                itemRefs.current[index] = itemRefs.current[index] || null;

                const handleClick = () => {
                  // "togglePlay" uses the original index in musicFiles
                  const originalIndex = musicFiles.findIndex(
                    (mf) => mf.path === file.path
                  );
                  togglePlay(originalIndex);
                  setFocusedIndex(index);
                  setIsUsingArrowKeys(false);
                };

                // Build album art data url or default
                const albumArtUrl = file.albumArt || artDefault;

                return (
                  <button
                    key={file.path}
                    id={`song-${index}`}
                    ref={(el) => (itemRefs.current[index] = el)}
                    onClick={handleClick}
                    tabIndex={-1}
                    className={`w-full p-1 flex items-center text-left rounded-xl duration-200 group ${
                      isActive
                        ? `bg-white/20 ${
                            isFocused ? "text-white/60" : "text-white"
                          }`
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    } ${isFocused ? "bg-white/10 text-white" : ""}`}
                    role="option"
                    aria-selected={isFocused}
                  >
                    {/* The tiny dot indicator */}
                    <div className="w-8 h-8 flex items-center justify-center">
                      {isActive ? (
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-white/20 group-hover:bg-white/40 duration-200" />
                      )}
                    </div>
                    {/* Album Art + Title + Artist */}
                    <div className="flex items-center p-2">
                      <img
                        src={albumArtUrl}
                        onError={(e) => (e.target.src = artDefault)}
                        alt="Album Art"
                        className="w-20 h-20 object-cover"
                      />

                      <div className="ml-4 w-[230px]">
                        <span className="block text-sm font-semibold truncate">
                          {meta.title ||
                            (file.name
                              ? file.name.replace(/\.mp3$/i, "")
                              : "Unknown Title")}
                        </span>
                        <div className="flex flex-col text-xs text-white/40">
                          {Array.isArray(meta.artist) &&
                          meta.artist.length > 0 ? (
                            meta.artist
                              .slice(0, 3) // Show up to 3 artists
                              .map((artist, i) =>
                                i === 2 && meta.artist.length > 3 ? (
                                  <span key={i}>...</span> // Show "..." if there are more than 3 artists
                                ) : (
                                  <span key={i} className="block">
                                    {artist}
                                  </span>
                                )
                              )
                          ) : (
                            <span className="block">
                              {meta.artist || "Unknown Artist"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* A-Z scroller on the right */}
          <div className="flex text-[12.5px] gap-0.5 flex-col ml-1 mr-2">
            {letters.map((letter) => (
              <button
                key={letter}
                onClick={() => scrollToLetter(letter)}
                className={`duration-150 ${
                  activeLetters.has(letter)
                    ? "text-white"
                    : "text-white/40 hover:text-white"
                } `}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
