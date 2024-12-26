import { PlusCircle, ClipboardPen, CalendarIcon } from "lucide-react";

const NewLocalTaskModal = ({
  newTask,
  setNewTask,
  clearAllFields,
  handleContainerClick,
  dateInputRef,
  handleAddTask,
  notification,
  setNotification,
}) => {
  return (
    <div className="fixed rounded-3xl overflow-hidden inset-0 backdrop-blur-md bg-black/60 flex items-center justify-center z-50 px-4 py-8">
      {notification && (
        <div
          className={`fixed top-5 right-5 px-6 py-3 rounded-lg shadow-lg text-white backdrop-blur-sm 
          ${
            notification.type === "error"
              ? "bg-red-500/20 border border-red-500/30"
              : "bg-cyan-500/20 border border-cyan-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-light tracking-wide">
              {notification.message}
            </span>
            <button
              onClick={() => setNotification(null)}
              style={{ userSelect: "none" }}
              className="ml-4 text-white hover:opacity-70 focus:outline-none transition-opacity"
            >
              &times;
            </button>
          </div>
        </div>
      )}

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
          <div className="flex w-full items-center mr-2 relative">
            <ClipboardPen className="w-8 h-auto mr-3 text-white" />
            <input
              type="text"
              value={newTask.title}
              onChange={(e) =>
                setNewTask({ ...newTask, title: e.target.value })
              }
              className="text-cyan-50 text-xl mr-8 truncate w-full border-b border-white/20 font-light tracking-wide bg-transparent focus:outline-none focus:border-cyan-500/50 transition-colors placeholder-cyan-200/30"
              placeholder="Enter task title"
              onKeyDown={(e) => e.stopPropagation()}
            />
            <button
              className="absolute right-0 text-center p-2 rounded-full text-white text-2xl hover:rotate-90 focus:outline-none duration-300"
              onClick={clearAllFields}
            >
              &times;
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto h-[800px] scrollbar-hide">
          <div className="relative flex justify-between text-sm mb-4 group">
            <div
              className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-white/10 cursor-pointer hover:border-cyan-500/30 transition-all duration-300 bg-white/5"
              onClick={handleContainerClick}
            >
              <CalendarIcon className="w-4 -mt-0.5 h-4 text-cyan-400" />
              <input
                type="date"
                ref={dateInputRef}
                style={{ visibility: "hidden", position: "absolute" }}
                value={newTask.date}
                onChange={(e) =>
                  setNewTask({ ...newTask, date: e.target.value })
                }
              />
              <span className="text-white font-light tracking-wide">
                {newTask.date
                  ? new Date(newTask.date).toLocaleDateString("ja-JP", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "Select date"}
              </span>
            </div>

            <button
              onClick={handleAddTask}
              className="px-6 py-2 rounded-lg flex bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 hover:text-white border border-cyan-400 transition-all duration-300"
            >
              <PlusCircle size={18} className="mr-2 text-cyan-400" />
              <p className="text-sm font-light tracking-wider">Add Task</p>
            </button>
          </div>

          <div
            className="h-full"
            style={{ height: "calc(100% - 60px)", minHeight: "200px" }}
          >
            <textarea
              value={newTask.description}
              onChange={(e) =>
                setNewTask({ ...newTask, description: e.target.value })
              }
              className="w-full h-full bg-white/5 text-white text-sm whitespace-pre-wrap border border-white/10 hover:border-white/20 focus:border-cyan-500/30 rounded-lg focus:outline-none p-4 font-light tracking-wide transition-all duration-300 placeholder-cyan-200/30"
              placeholder="Enter task description"
              rows={5}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Tab") {
                  e.preventDefault();
                  const { selectionStart, selectionEnd } = e.target;
                  const value = e.target.value;
                  setNewTask({
                    ...newTask,
                    description:
                      value.substring(0, selectionStart) +
                      "\t" +
                      value.substring(selectionEnd),
                  });
                  setTimeout(() => {
                    e.target.selectionStart = e.target.selectionEnd =
                      selectionStart + 1;
                  }, 0);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewLocalTaskModal;
