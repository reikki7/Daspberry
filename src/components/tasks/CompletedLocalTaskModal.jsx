import {
  CalendarCheck,
  CalendarIcon,
  ClipboardCheck,
  BookX,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CompletedLocalTaskModal = ({
  tasks,
  setCompletedTasksModalOpen,
  handleTaskComplete,
  processTaskDescription,
}) => {
  return (
    <div className="fixed rounded-3xl inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-50 px-4 py-8">
      <div className="bg-gray-950/60 overflow-hidden rounded-lg max-w-4xl w-full max-h-full flex flex-col">
        <div
          data-tauri-drag-region
          className="p-4 text-white relative flex justify-between items-center"
          style={{
            background:
              "linear-gradient(to right, rgb(248, 103, 240, 0.2), rgba(0, 128, 255, 0.2), rgba(0, 255, 255, 0.2)",
          }}
        >
          <div className="flex items-center gap-1">
            <ClipboardCheck className="w-8 h-auto mr-2" />
            <h2 className="text-xl font-semibold">Completed Tasks</h2>
          </div>
          <button
            className="text-center p-2 duration-100 rounded-full text-white text-2xl font-bold hover:text-gray-300 focus:outline-none"
            onClick={() => setCompletedTasksModalOpen(false)}
          >
            &times;
          </button>
        </div>

        {/* List Completed tasks */}
        <div className="p-6 overflow-y-auto h-[800px] custom-scrollbar">
          {tasks &&
            tasks
              .filter((task) => task.completed)
              .map((task) => (
                <div
                  key={task.id}
                  className="bg-gray-800/20 p-4 rounded-lg mb-4"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-white line-clamp-2 truncate">
                      {task.title}
                    </h3>

                    {/* incomplete button */}
                    <button
                      onClick={() => handleTaskComplete(task.id, false)}
                      className="border px-3 py-1 border-red-600/70 hover:text-red-600 hover:border-red-600 rounded text-sm duration-200 flex items-center gap-1"
                    >
                      <BookX size={17} />
                      Mark as Incomplete
                    </button>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-4">
                      {new Date(task.date) < new Date() &&
                        task.date !== null && (
                          <div className="bg-red-500/70 -ml-2 px-2 py-1 rounded-full text-xs flex items-center">
                            Overdue
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="text-[13px] text-white/70 flex items-center mb-3">
                    <CalendarIcon className="w-4 h-4 mr-2 -mt-0.5 text-white/50" />
                    {task.date
                      ? new Date(task.date).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                      : "No due date"}
                  </div>

                  {/* Completed On Date */}
                  <div className="text-[13px] text-white/70 flex items-center mb-3">
                    <CalendarCheck className="w-4 h-4 mr-2 -mt-0.5 text-white/50" />
                    {task.completed_on ? (
                      <>
                        {new Date(task.completed_on).toLocaleDateString(
                          "en-US",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          }
                        )}
                        {" — ("}
                        {formatDistanceToNow(new Date(task.completed_on), {
                          addSuffix: true,
                        })}
                        {")"}
                      </>
                    ) : (
                      "No completion date"
                    )}
                  </div>

                  <hr className="border-t border-gray-600 my-4" />

                  <div className="text-sm text-white/70 mt-2 line-clamp-3 text-wrap whitespace-pre-wrap">
                    {processTaskDescription(task.description)}
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
};

export default CompletedLocalTaskModal;
