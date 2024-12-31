import {
  ClipboardCheck,
  CalendarIcon,
  CalendarCheck,
  BookX,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CompletedLocalTaskModal = ({
  tasks,
  setCompletedTasksModalOpen,
  handleTaskComplete,
  processTaskDescription,
}) => {
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setCompletedTasksModalOpen(false);
    }
  };

  return (
    <div className="fixed rounded-3xl overflow-hidden inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 px-4 py-8" onClick={handleOverlayClick}>
      <div className="bg-gray-950/80 rounded-2xl overflow-hidden max-w-4xl w-full max-h-full flex flex-col border border-white/10 shadow-2xl">
        <div
          data-tauri-drag-region
          className="p-5 text-white relative"
          style={{
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.1) 100%)",
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-bl-full" />
          <div className="flex items-center gap-1">
            <ClipboardCheck className="w-7 h-auto mr-3 text-white" />
            <h2 className="text-xl font-light tracking-wide truncate">
              Completed Tasks
            </h2>
          </div>
          <button
            className="absolute top-3 right-4 text-center p-2 rounded-full text-white text-2xl hover:rotate-90 duration-300 focus:outline-none"
            onClick={() => setCompletedTasksModalOpen(false)}
            style={{ userSelect: "none" }}
          >
            &times;
          </button>
        </div>

        {/* List Completed tasks */}
        <div className="p-6 overflow-y-auto h-[800px] scrollbar-hide">
          {tasks &&
            tasks
              .filter((task) => task.completed)
              .map((task) => (
                <div
                  key={task.id}
                  className="bg-gray-900/60 p-4 rounded-lg mb-4  border border-gray-700/50 
                hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-400/30 transition-all duration-300"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-light tracking-wide text-white truncate">
                      {task.title}
                    </h3>

                    {/* Incomplete button */}
                    <button
                      onClick={() => handleTaskComplete(task.id, false)}
                      className="text-red-400 bg-red-500/10 border border-red-500/20 p-2 hover:border-red-500/40 rounded-xl transition-all duration-300 backdrop-blur-xl hover:bg-red-500/20 text-sm flex items-center gap-1"
                    >
                      <BookX size={17} />
                      Mark as Incomplete
                    </button>
                  </div>

                  {/* Task Date */}
                  <div className="text-[13px] text-white flex items-center my-2">
                    <CalendarIcon className="w-4 h-4 mr-2 text-cyan-400" />
                    {task.date
                      ? new Date(task.date).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                      : "No due date"}
                  </div>

                  {/* Completed On Date */}
                  <div className="text-[13px] text-white flex items-center mb-4">
                    <CalendarCheck className="w-4 h-4 mr-2 text-cyan-400" />
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
                        <span className="text-gray-400 ml-1.5">
                          {" — ("}

                          {formatDistanceToNow(new Date(task.completed_on), {
                            addSuffix: true,
                          })}
                          {")"}
                        </span>
                      </>
                    ) : (
                      "No completion date"
                    )}
                  </div>

                  <hr className="border-t border-white/20 my-4" />

                  <div className="text-sm text-white mt-2 whitespace-pre-wrap">
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
