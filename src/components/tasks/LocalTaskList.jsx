import React, { memo, useEffect } from "react";
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
  }) => {
    return (
      <div className="w-full pb-4">
        {tasks.filter((task) => !task.completed).length === 0 && (
          <div className="text-white text-center text-md my-3">
            No TODO found. Click "Add TODO" to create a new task.
          </div>
        )}
        <div
          className={` flex justify-between w-full ${
            tasks.filter((task) => !task.completed).length > 0 ? "h-72" : ""
          }`}
        >
          <div className="">
            <div className="flex h-full gap-4">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  className="relative w-[239px] bg-gradient-to-br border hover:backdrop-blur-md bg-gray-950/30 backdrop-blur-lg p-2 text-left rounded-lg hover:bg-[#c08feb]/20 shadow-lg hover:shadow-xl transition-all border-none outline-none"
                  onClick={() => handleTaskClick(task)}
                >
                  {/* Header Section */}
                  <div className="mx-2 mt-1">
                    <h3 className="text-white text-wrap line-clamp-3 truncate">
                      {task.title}
                    </h3>
                    <div className="flex mt-3 justify-between">
                      <div className="text-[13px] text-white/70 flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2 -mt-0.5 text-white/50" />
                        {task.date
                          ? new Date(task.date).toLocaleDateString("en-ID", {
                              day: "2-digit",
                              month: "long",
                            })
                          : "No due date"}
                      </div>
                      {new Date(task.date) <
                        new Date(new Date().setHours(0, 0, 0, 0)) &&
                        task.date !== null && (
                          <div className="bg-red-500/70 px-2 py-1 rounded-full text-xs flex items-center">
                            Overdue
                          </div>
                        )}
                    </div>
                    <hr className="my-3 border-t border-gray-300/40" />
                  </div>

                  {/* Task Description */}
                  <div className="h-full mx-2 overflow-y-auto text-sm text-white/70 text-wrap whitespace-pre-wrap max-h-[170px]">
                    {task.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Only show up if there are more than 5 incomplete tasks */}
        {totalIncompleteTasks > 5 && (
          <div className="flex items-center justify-center gap-6 mt-5">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="text-sm font-medium transition-colors disabled:opacity-50 disabled:hover:bg-gray-100/0 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  onClick={() => setCurrentPage(index + 1)}
                  key={index}
                  className={`h-2 w-2 rounded-full ${
                    index + 1 === currentPage ? "bg-teal-500" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="text-sm font-medium transition-colors disabled:opacity-50 disabled:hover:bg-gray-100/0 rounded-lg"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    );
  }
);

export default LocalTaskList;
