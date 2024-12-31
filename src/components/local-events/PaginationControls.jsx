import { ChevronLeft, ChevronRight } from "lucide-react";

const PaginationControls = ({
  paginatedEvents,
  currentPage,
  setCurrentPage,
}) => {
  if (paginatedEvents.totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-4 mt-4">
      <button
        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
        className="p-2 rounded-lg bg-slate-800/50 text-cyan-400 border border-cyan-500/30 
                   hover:bg-slate-700/80 hover:border-cyan-400 transition-all duration-300
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={20} />
      </button>
      <span className="text-cyan-400">
        Page {currentPage} of {paginatedEvents.totalPages}
      </span>
      <button
        onClick={() =>
          setCurrentPage((prev) =>
            Math.min(prev + 1, paginatedEvents.totalPages)
          )
        }
        disabled={currentPage === paginatedEvents.totalPages}
        className="p-2 rounded-lg bg-slate-800/50 text-cyan-400 border border-cyan-500/30 
                   hover:bg-slate-700/80 hover:border-cyan-400 transition-all duration-300
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
};
export default PaginationControls;
