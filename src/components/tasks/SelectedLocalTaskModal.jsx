import React from "react";

import { ClipboardPenLine } from "lucide-react";
import { CalendarIcon, Trash2, Check, Pencil, Eye } from "lucide-react";

const SelectedLocalTaskModal = ({
  selectedTask,
  setSelectedTask,
  handleTitleChange,
  handleUpdateTask,
  closeNewTaskModal,
  errorMessage,
  editMode,
  setEditMode,
  handleContainerClick,
  dateInputRef,
  handleDeleteTask,
  taskIsComplete,
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
              "linear-gradient(to right, rgb(248, 103, 240, 0.2), rgba(0, 128, 255, 0.2), rgba(0, 255, 255, 0.2))",
          }}
        >
          <ClipboardPenLine className="w-8 h-auto mr-3" />
          {/* Editable Title */}
          <input
            type="text"
            value={selectedTask.title}
            onChange={handleTitleChange}
            onBlur={handleUpdateTask}
            className="text-white text-xl font-bold bg-transparent focus:outline-none"
            placeholder="Enter task title"
            style={{ width: "100%" }}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <button
            className="text-center p-2 duration-100 rounded-full text-white text-2xl font-bold hover:text-gray-300 focus:outline-none"
            onClick={closeNewTaskModal}
          >
            &times;
          </button>
        </div>

        {errorMessage && (
          <div className="text-red-500 mb-2 text-sm">{errorMessage}</div>
        )}

        <div
          className={`p-6 overflow-y-auto ${
            editMode ? "h-[800px]" : "max-h-[800px]"
          }  custom-scrollbar`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm space-x-2 mb-4">
              <div
                className="flex items-center space-x-2 cursor-pointer px-3 py-2 rounded border border-white/20 hover:border-white/40 transition-colors"
                onClick={handleContainerClick}
              >
                <CalendarIcon className="w-4 h-4 text-white/50 pointer-events-none" />
                <input
                  type="date"
                  ref={dateInputRef}
                  className="text-white bg-transparent border-none focus:outline-none cursor-pointer"
                  value={selectedTask.date || ""}
                  onChange={(e) => {
                    const newDate = e.target.value || "";
                    setSelectedTask({
                      ...selectedTask,
                      date: newDate,
                    });
                  }}
                  style={{ visibility: "hidden", position: "absolute" }}
                />
                <span className="text-white" style={{ userSelect: "none" }}>
                  {selectedTask.date
                    ? new Date(selectedTask.date).toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : "Select a date"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="text-white border p-[7px] border-white/80 hover:border-white/40 rounded text-sm duration-200 flex items-center gap-1"
                >
                  <Pencil size={15} />
                </button>
              ) : (
                <button
                  onClick={() => setEditMode(false)}
                  className="text-white border p-[7px] border-white/80 hover:border-white/40 rounded text-sm duration-200 flex items-center gap-1"
                >
                  <Eye size={15} />
                </button>
              )}
              <button
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="text-red-500 border p-[7px] border-red-500/80 hover:border-red-500/40 rounded text-sm duration-200 flex items-center gap-1"
              >
                <Trash2 size={15} />
              </button>
              <button
                onClick={() =>
                  handleTaskComplete(selectedTask.id, !taskIsComplete)
                }
                className={`flex items-center gap-2 py-1.5 px-2.5 rounded duration-200 text-sm ${
                  taskIsComplete
                    ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    : "border border-white hover:border-green-400 hover:text-green-400"
                }`}
              >
                <Check size={17} />
                {taskIsComplete ? "Completed" : "Mark as Complete"}
              </button>
            </div>
          </div>

          {/* Editable Description */}
          <div className="h-full" style={{ height: "calc(100% - 60px)" }}>
            {editMode ? (
              <textarea
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const { selectionStart, selectionEnd } = e.target;
                    const value = e.target.value;
                    setSelectedTask({
                      ...selectedTask,
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
                value={selectedTask.description}
                onChange={(e) =>
                  setSelectedTask({
                    ...selectedTask,
                    description: e.target.value,
                  })
                }
                className="mb-4 whitespace-pre-wrap text-white/80 focus:outline-none bg-transparent w-full border-white/20 border focus:border-white/40 rounded  h-full p-2"
                placeholder="Enter task description"
                rows={5}
              />
            ) : (
              <div className="text-sm text-white/70 mt-2 whitespace-pre-wrap">
                {processTaskDescription(selectedTask.description)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectedLocalTaskModal;
