import React, { memo } from "react";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";

const LocalTaskList = memo(
  ({
    tasks,
    handleTaskClick,
    currentPage,
    totalPages,
    goToPreviousPage,
    goToNextPage,
    setCurrentPage,
    totalIncompleteTasks,
    processTaskDescription,
  }) => {
    return (
      <div className="w-full pb-4">
        {tasks.filter((task) => !task.completed).length === 0 && (
          <div className="text-white text-center text-lg my-3 font-light tracking-wider animate-pulse">
            No TODO found. Click "Add TODO" to create a new task.
          </div>
        )}
        <div
          className={`flex justify-between w-full ${
            tasks.filter((task) => !task.completed).length > 0 ? "h-72" : ""
          }`}
        >
          <div className="w-full">
            <div className="flex h-full gap-4 pb-2 scrollbar-hide">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  className="relative w-[241.5px] min-w-[241.5px] h-[285px]  bg-gray-950/45 backdrop-blur-xl p-3 text-left rounded-xl transition-all duration-300 group border border-white/5 hover:border-purple-500/30 shadow-lg hover:shadow-cyan-500/10 flex flex-col"
                  onClick={() => handleTaskClick(task)}
                >
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-bl-xl" />

                  {/* Header Section */}
                  <div className="mx-2 mt-1 relative">
                    <h3 className="text-white font-light tracking-wide text-lg break-words">
                      {task.title}
                    </h3>
                    <div className="flex mt-3 justify-between items-center">
                      <div className="text-[12px] text-gray-200/70 flex items-center bg-white/5 px-3 py-1 rounded-full">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {task.date
                          ? new Date(task.date).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "long",
                            })
                          : "No Due Date"}
                      </div>
                      {new Date(task.date) <
                        new Date(new Date().setHours(0, 0, 0, 0)) &&
                        task.date !== null && (
                          <div className="bg-red-500/20 border border-red-500/30 px-3 py-1 rounded-full text-xs flex items-center text-red-300">
                            Overdue
                          </div>
                        )}
                    </div>
                    <hr className="my-3 border-t border-white/10" />
                  </div>

                  {/* Task Description */}
                  <div className="w-full mx-2 text-xs text-white/70 break-words whitespace-pre-wrap flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide ">
                    {processTaskDescription(task.description)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pagination */}
        {totalIncompleteTasks > 5 && (
          <div className="flex items-center justify-center gap-6 mt-5">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="text-cyan-400 p-1 rounded-lg transition-colors disabled:opacity-30 hover:bg-cyan-400/10 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  onClick={() => setCurrentPage(index + 1)}
                  key={index}
                  className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                    index + 1 === currentPage ? "bg-cyan-400" : "bg-white/20"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="text-cyan-400 p-1 rounded-lg transition-colors disabled:opacity-30 hover:bg-cyan-400/10 disabled:hover:bg-transparent"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    );
  }
);

export default LocalTaskList;
