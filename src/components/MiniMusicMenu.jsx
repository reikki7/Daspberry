import React, { useEffect, useRef, useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { FixedSizeList } from "react-window";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

const ITEM_HEIGHT = 44; // Height of each track item (matches current padding + height)
const WINDOW_HEIGHT = 600; // Matches current menu height

const MenuItem = React.memo(({ data, index, style }) => {
  const {
    tracks,
    currentTrackIndex,
    playTrack,
    loadMetadataForTrack,
    observerRef,
  } = data;
  const track = tracks[index];
  const itemRef = useRef(null);

  useEffect(() => {
    if (itemRef.current && observerRef.current) {
      observerRef.current.observe(itemRef.current);
    }

    return () => {
      if (itemRef.current && observerRef.current) {
        observerRef.current.unobserve(itemRef.current);
      }
    };
  }, [track]);

  return (
    <button
      ref={itemRef}
      style={style}
      key={track.path}
      onClick={() => playTrack(index)}
      className={`text-left px-3 py-2 rounded-lg hover:bg-white/10 truncate ${
        currentTrackIndex === index ? "bg-white/20" : ""
      }`}
      data-track-path={track.path}
    >
      {track.metadata?.title || track.name.replace(/\.mp3$/i, "")}
    </button>
  );
});

const MiniMusicMenu = ({
  showMenu,
  toggleMenu,
  currentTrackIndex,
  playTrack,
}) => {
  const [tracks, setTracks] = useState([]);
  const [loadedMetadata, setLoadedMetadata] = useState(new Set());
  const observerRef = useRef(null);
  const listRef = useRef(null);

  // Initialize intersection observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const trackPath = entry.target.dataset.trackPath;
            if (trackPath && !loadedMetadata.has(trackPath)) {
              loadMetadataForTrack(trackPath);
            }
          }
        });
      },
      {
        root: listRef.current,
        rootMargin: "100px",
        threshold: 0.1,
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Initial track scanning
  useEffect(() => {
    const scanLibrary = async () => {
      try {
        const scannedTracks = await invoke("scan_music_directory");
        setTracks(scannedTracks);
      } catch (error) {
        console.error("Error scanning music directory:", error);
      }
    };

    if (showMenu) {
      scanLibrary();
    }
  }, [showMenu]);

  // Load metadata for visible tracks
  const loadMetadataForTrack = useCallback(
    async (trackPath) => {
      if (loadedMetadata.has(trackPath)) return;

      try {
        const metadata = await invoke("load_track_metadata", {
          path: trackPath,
        });
        setTracks((current) =>
          current.map((track) =>
            track.path === trackPath ? { ...track, metadata } : track
          )
        );
        setLoadedMetadata((current) => new Set([...current, trackPath]));
      } catch (error) {
        console.error("Error loading track metadata:", error);
      }
    },
    [loadedMetadata]
  );

  if (!showMenu) return null;

  return (
    <div className="z-50">
      <div className="absolute top-0 left-0 w-full h-full bg-black/50 flex flex-col justify-center items-center">
        <div
          ref={listRef}
          className="bg-gray-950/70 overflow-hidden h-[600px] shadow-lg custom-scrollbar"
        >
          <div className="sticky top-0 z-10 overflow-hidden">
            <div className="flex justify-between overflow-hidden backdrop-blur-lg px-6 py-4 items-center">
              <h2 className="text-lg font-semibold text-white">
                Music Library
              </h2>
              <button onClick={toggleMenu} className="text-white">
                <FontAwesomeIcon
                  icon={faXmark}
                  className="hover:opacity-80 duration-200"
                />
              </button>
            </div>
          </div>

          <FixedSizeList
            height={WINDOW_HEIGHT - 60} // Subtract header height
            width="100%"
            itemCount={tracks.length}
            itemSize={ITEM_HEIGHT}
            itemData={{
              tracks,
              currentTrackIndex,
              playTrack,
              loadMetadataForTrack,
              observerRef,
            }}
          >
            {MenuItem}
          </FixedSizeList>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MiniMusicMenu);
