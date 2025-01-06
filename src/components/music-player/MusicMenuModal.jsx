import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import artDefault from "../../assets/art-default.jpg";
import { faCompactDisc } from "@fortawesome/free-solid-svg-icons";
import { ArrowUpZA, ArrowDownAZ, RefreshCw } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import MusicMenuPlayerControls from "./MusicMenuPlayerControls";

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
  fetchSongMetadata,
  isLoadingMetadata,
  loadMusicFiles,
  setIsSongFetchPopUp,
  setCurrentFileName,
  newSongsList,
  setNewSongsList,
}) => {
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

  const currentFile = useMemo(
    () =>
      musicFiles.find(
        (musicFile) => convertFileSrc(musicFile.path) === currentTrack
      ),
    [musicFiles, currentTrack]
  );

  const filteredMusic = useMemo(() => {
    return musicFiles
      .filter((file) => {
        const meta = metadata[file.path];
        if (!meta) return false;
        const searchLower = searchTerm.toLowerCase();
        const titleMatch = (meta.title || file.name.replace(/\.mp3$/i, ""))
          .toLowerCase()
          .includes(searchLower);
        const artistMatch = meta.artists
          ? meta.artists.some((artist) =>
              artist.toLowerCase().includes(searchLower)
            )
          : meta.artist
          ? meta.artist.toLowerCase().includes(searchLower)
          : false;
        return titleMatch || artistMatch;
      })
      .sort((a, b) => {
        const normalize = (str) =>
          str.replace(/^[^\p{L}\p{N}]+/u, "").toLowerCase();
        const metaA = normalize(metadata[a.path]?.title || a.name);
        const metaB = normalize(metadata[b.path]?.title || b.name);
        return sortOrder === "asc"
          ? metaA.localeCompare(metaB)
          : metaB.localeCompare(metaA);
      });
  }, [musicFiles, metadata, searchTerm, sortOrder]);

  // Update the letterPositions function to add null checks
  const letterPositions = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !filteredMusic.length) return new Map();

    const positions = new Map();
    let currentLetter = "";

    filteredMusic.forEach((file, index) => {
      const element = itemRefs.current[index];
      if (!element) return;

      const title = metadata[file.path]?.title || file.name;
      const firstLetter = title.charAt(0).toUpperCase();

      if (firstLetter !== currentLetter) {
        currentLetter = firstLetter;
        try {
          const rect = element.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const relativeTop =
            rect.top - containerRect.top + container.scrollTop;
          positions.set(currentLetter, relativeTop);
        } catch (error) {
          // If there's any error getting positions, skip this letter
          console.debug("Skipping letter position calculation:", error);
        }
      }
    });

    return positions;
  }, [filteredMusic, metadata]);

  // Update the handleScroll function to be more defensive
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
  }, [filteredMusic]);

  // Generate available letters from filteredMusic
  const letters = useMemo(() => {
    const allLetters = Array.from(
      new Set(
        filteredMusic.map((file) => {
          const title = metadata[file.path]?.title || file.name;
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
      const metaTitle = (metadata[file.path]?.title || file.name).trim();
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

  const toggleSortOrder = () => {
    setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
    // Maintain focused index position after sort unless it's invalid
    setFocusedIndex((current) => Math.min(current, filteredMusic.length - 1));
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setIsSongFetchPopUp(false);
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
        const originalIndex = musicFiles.findIndex(
          (musicFile) => musicFile.path === selectedFile.path
        );
        togglePlay(originalIndex);
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
  }, [filteredMusic, isPlaying, isSearchFocused, focusedIndex]);

  useEffect(() => {
    // Only adjust focusedIndex if it's out of bounds of the new filtered list
    if (focusedIndex >= filteredMusic.length) {
      setFocusedIndex(Math.max(0, filteredMusic.length - 1));
    }
  }, [filteredMusic.length]);

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
                setIsSongFetchPopUp(false);
                setMusicMenu(false);
              }}
              className="w-8 h-8 flex items-center hover:rotate-90 justify-center rounded-full text-white/60 hover:text-white duration-200"
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

          {/* Search Bar */}
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="relative w-full">
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
              <button
                onClick={toggleSortOrder}
                className="text-white/60 px-3 hover:text-white duration-200"
                title="Toggle Sort Order"
              >
                {sortOrder === "asc" ? <ArrowDownAZ /> : <ArrowUpZA />}
              </button>
              <button
                onClick={async () => {
                  setCurrentFileName(null);
                  await loadMusicFiles(true);
                  await fetchSongMetadata(musicFiles, true);
                  alert(
                    `Music Library updated successfully!\n${
                      newSongsList > 0 ? `\nNew Songs: ${newSongsList}` : ""
                    }\nSongs scanned: ${musicFiles.length}`
                  );
                }}
                disabled={isLoadingMetadata}
                className="text-white/60 group px-2 hover:text-white duration-200"
                title="Refresh Library"
              >
                <RefreshCw
                  size={18}
                  className={` duration-300 ${
                    isLoadingMetadata
                      ? "animate-spin"
                      : "group-hover:rotate-180"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div
          className="flex music-list justify-between items-center"
          tabIndex={-1}
        >
          {/* Music List */}
          <div
            ref={scrollContainerRef}
            className={`p-2 overflow-y-auto custom-scrollbar focus:outline-none 
    ${currentTrack ? "h-[573px]" : "h-[717px]"} `}
            role="listbox"
            tabIndex={-1}
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
                    ref={(e) => (itemRefs.current[index] = e)}
                    id={`song-${index}`}
                    key={index}
                    onClick={() => {
                      togglePlay(originalIndex);
                      setFocusedIndex(index);
                      setIsUsingArrowKeys(false); // Clear highlight on click
                    }}
                    tabIndex={-1}
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
                        src={albumArtList[file.path] || artDefault}
                        onError={(e) => (e.target.src = artDefault)}
                        alt="Album Art"
                        className="w-20 h-20 object-cover"
                      />
                      {/* Track Info */}
                      <div className="ml-4 w-[230px]">
                        <span className="block text-sm font-semibold truncate">
                          {metadata[file.path]?.title ||
                            file?.name.replace(/\.mp3$/i, "") ||
                            "Unknown Title"}
                        </span>
                        <span className="block text-xs text-white/40">
                          {metadata[file.path]?.artists ? (
                            <>
                              {metadata[file.path]?.artists
                                .slice(0, 2)
                                .map((artist, index) => (
                                  <p
                                    key={index}
                                    className="text-white/60 text-xs truncate"
                                  >
                                    {artist}
                                  </p>
                                ))}
                              {metadata[file.path]?.artists.length === 3 && (
                                <p className="text-white/60 text-xs truncate">
                                  {metadata[originalIndex]?.artists[2]}
                                </p>
                              )}
                              {metadata[file.path]?.artists.length > 3 && (
                                <p className="text-white/60 text-xs truncate">
                                  ...
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-white/60 text-xs truncate">
                              {metadata[file.path]?.artist || "Unknown Artist"}
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

          {/* Alphabetical Scroll */}
          <div className="flex text-[12.5px] gap-0.5 flex-col ml-1 mr-2">
            {letters.map((letter) => (
              <button
                key={letter}
                onClick={() => scrollToLetter(letter)}
                className={`
              transition-opacity duration-150
              ${activeLetters.has(letter) ? "text-white" : "text-white/40"}
              hover:text-white
            `}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicMenuModal;
