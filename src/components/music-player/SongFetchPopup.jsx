import { ChevronsLeft } from "lucide-react";

const SongFetchPopup = ({
  isSongFetchPopUp,
  musicMenu,
  setIsSongFetchPopUp,
  isLoadingMetadata,
  currentFileName,
  musicFiles,
  newSongsList,
  removedFiles,
}) => {
  if (!isSongFetchPopUp) return null;

  return (
    <div
      className={`
        fixed
        ${musicMenu ? "right-5 w-64" : "-right-[250px] hover:right-5 w-72"}
        top-20
        z-[250]
        duration-300
        animate-fadeIn
      `}
    >
      <div className="relative w-full rounded-2xl bg-gray-950/50 backdrop-blur-xs backdrop-brightness-75 border border-white/5 shadow-lg overflow-hidden">
        {/* Chevron indicator */}
        <ChevronsLeft
          className={`
            ${musicMenu ? "opacity-0" : "opacity-100 group-hover:opacity-0"}
            absolute left-2 top-1/2 -translate-y-1/2
            duration-300
          `}
        />

        {/* Main content container */}
        <div className="relative p-6">
          {/* Close button */}
          <button
            onClick={() => setIsSongFetchPopUp(false)}
            className="absolute top-2 right-2 p-2 text-white/60 hover:text-white hover:rotate-90 duration-300 rounded-full"
          >
            ✕
          </button>

          {/* Loading section */}
          <div className="mb-4">
            <div
              className={`
                text-center text-xs text-gray-400 font-medium mb-3
                ${isLoadingMetadata && "animate-pulse"}
              `}
            >
              {isLoadingMetadata ? "Collecting songs..." : "Library updated!"}
            </div>
            <div className="text-center text-white/90 font-medium truncate px-2 py-1 rounded-lg">
              {isLoadingMetadata
                ? currentFileName || "\u00A0"
                : `${musicFiles.length} songs scanned.`}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-4" />

          {/* New songs section */}
          {newSongsList.length > 0 && (
            <>
              {/* Counter */}
              <div
                className={`
                  ${!musicMenu ? "ml-10 group-hover:ml-0" : "ml-0"}
                  text-white/60 text-xs font-medium mb-3
                  duration-300
                `}
              >
                {newSongsList.length} new songs found
              </div>

              {/* Songs list */}
              <div
                className={`
                  ${!musicMenu ? "ml-10 group-hover:ml-0" : "ml-0"}
                  max-h-40 overflow-y-auto
                  duration-300
                  flex flex-col gap-3
                  scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent
                `}
              >
                {newSongsList.map((song, index) => (
                  <div key={index} className="group">
                    <div className="text-white/80 text-sm truncate duration-300">
                      {song}
                    </div>
                    {index < newSongsList.length - 1 && (
                      <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mt-3" />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {removedFiles.length > 0 && (
            <>
              <div className="text-white/60 text-xs font-medium mt-3 mb-3">
                {removedFiles.length} songs removed
              </div>
              <div className="max-h-40 overflow-y-auto flex flex-col gap-3 scrollbar-thin scrollbar-thumb-white/20">
                {removedFiles.map((file, index) => (
                  <div key={index} className="group">
                    <div className="text-red-400 text-sm truncate">
                      {file.name}
                    </div>
                    {index < removedFiles.length - 1 && (
                      <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mt-3" />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SongFetchPopup;
