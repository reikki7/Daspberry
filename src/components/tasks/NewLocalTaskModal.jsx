import { PlusCircle, ClipboardPen } from "lucide-react";
import { CalendarIcon } from "lucide-react";

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
    <div className="fixed rounded-3xl inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-50 px-4 py-8">
      {notification && (
        <div
          className={`fixed top-5 right-5 px-4 py-2 rounded shadow-lg text-white ${
            notification.type === "error" ? "bg-red-600" : "bg-green-600"
          }`}
        >
          <div className="flex items-center justify-between">
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-4">
              &times;
            </button>
          </div>
        </div>
      )}
      <div className="bg-gray-950/60 rounded-lg overflow-hidden max-w-4xl w-full max-h-full flex flex-col">
        <div
          data-tauri-drag-region
          className="p-4 text-white relative flex justify-between items-center"
          style={{
            background:
              "linear-gradient(to right, rgb(248, 103, 240, 0.2), rgba(0, 128, 255, 0.2), rgba(0, 255, 255, 0.2))",
          }}
        >
          <div className="flex w-full items-center mr-2">
            <ClipboardPen className="w-8 h-auto mr-3" />
            {/* Editable Title */}
            <input
              type="text"
              value={newTask.title}
              onChange={(e) =>
                setNewTask({
                  ...newTask,
                  title: e.target.value,
                })
              }
              className="text-white text-xl w-full border-b font-bold bg-transparent focus:outline-none"
              placeholder="Enter task title"
              onKeyDown={(e) => e.stopPropagation()}
              style={{ width: "100%" }}
            />
          </div>

          <button
            className="text-center p-2 duration-100 rounded-full text-white text-2xl font-bold hover:text-gray-300 focus:outline-none"
            onClick={clearAllFields}
          >
            &times;
          </button>
        </div>

        <div className="p-6 overflow-y-auto h-[800px] custom-scrollbar">
          <div className="relative flex justify-between text-sm mb-4 group">
            <div
              className="flex items-center space-x-2 px-3 py-2 rounded border border-white/20 cursor-pointer hover:border-white/40 transition-colors"
              onClick={handleContainerClick}
            >
              <CalendarIcon className="w-4 h-4 text-white/50 pointer-events-none" />
              <input
                type="date"
                ref={dateInputRef}
                style={{ visibility: "hidden", position: "absolute" }}
                className="text-white bg-transparent border-none focus:outline-none cursor-pointer"
                value={newTask.date}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    date: e.target.value,
                  })
                }
              />
              <span className="text-white" style={{ userSelect: "none" }}>
                {newTask.date
                  ? new Date(newTask.date).toLocaleDateString("en-US", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "Select a date"}
              </span>
            </div>
            <button
              onClick={handleAddTask}
              className="bg-cyan-500/50 hover:bg-blue-500/50 duration-300 rounded-full text-white px-4 py-2 flex items-center"
            >
              <PlusCircle size={20} className="mr-2" />
              <p className="text-sm mt-0.5">Add Task</p>
            </button>
          </div>

          {/* Description */}
          <div
            className="h-full"
            style={{ height: "calc(100% - 60px)", minHeight: "200px" }}
          >
            <textarea
              value={newTask.description}
              onChange={(e) =>
                setNewTask({
                  ...newTask,
                  description: e.target.value,
                })
              }
              className="w-full h-full bg-transparent text-white text-sm whitespace-pre-wrap border border-white/20 focus:border-white/40 rounded focus:outline-none p-2"
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
