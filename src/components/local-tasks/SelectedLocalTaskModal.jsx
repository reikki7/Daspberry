import { useEffect } from "react";
import { syncLocalTasksWithFirestore } from "../../utils/syncLocalTasks";

import {
  ClipboardPen,
  CalendarIcon,
  Trash2,
  Check,
  Pencil,
  Eye,
} from "lucide-react";
import AutocompleteInput from "./AutoCompleteInput";

const SelectedLocalTaskModal = ({
  tasks,
  setTasks,
  saveTasks,
  selectedTask,
  setSelectedTask,
  handleTitleChange,
  handleUpdateTask,
  closeSelectedTaskModal,
  errorMessage,
  editMode,
  setEditMode,
  handleContainerClick,
  dateInputRef,
  handleDeleteTask,
  taskIsComplete,
  handleTaskComplete,
  processTaskDescription,
  projects,
  isOnline,
}) => {
  const handleOverlayClick = (e) => {
    e.stopPropagation();
    if (e.target === e.currentTarget) {
      closeSelectedTaskModal();
    }
  };

  const handleCompleteTaskAction = async (taskId, isComplete) => {
    handleTaskComplete(taskId, isComplete);

    if (isOnline) {
      try {
        await syncLocalTasksWithFirestore(tasks, setTasks, saveTasks);
      } catch (error) {
        console.error("Error syncing tasks:", error);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleUpdateTask();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUpdateTask]);

  return (
    <div
      className="fixed rounded-3xl overflow-hidden inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 px-4 py-8"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-gray-950/80 rounded-2xl overflow-hidden max-w-4xl w-full flex flex-col border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
              value={selectedTask.title}
              onChange={handleTitleChange}
              className="text-cyan-50 text-xl w-full mr-8 truncate font-light tracking-wide bg-transparent focus:outline-none transition-colors placeholder-cyan-200/30"
              placeholder="タスクを入力 • Enter task title"
              onKeyDown={(e) => e.stopPropagation()}
            />
            <button
              className="absolute right-0 text-center p-2 rounded-full text-white text-2xl hover:rotate-90 duration-300 focus:outline-none"
              onClick={closeSelectedTaskModal}
              style={{ userSelect: "none" }}
            >
              &times;
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="text-red-500 mb-2 text-sm">{errorMessage}</div>
        )}

        <div className="p-6 overflow-y-auto scrollbar-hide">
          <div className=" flex items-center justify-between text-sm mb-4 group">
            <div className="flex gap-3">
              {/* Date Picker */}
              <div
                className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-white/10 cursor-pointer hover:border-cyan-500/30 transition-all duration-300 bg-white/5"
                onClick={handleContainerClick}
              >
                <CalendarIcon className="w-4 -mt-0.5 h-4 text-cyan-400" />
                <input
                  type="date"
                  ref={dateInputRef}
                  style={{ visibility: "hidden", position: "absolute" }}
                  value={selectedTask.date}
                  onChange={(e) => {
                    const newDate = e.target.value || "";
                    setSelectedTask({ ...selectedTask, date: newDate });
                  }}
                />
                <span className="text-white font-light tracking-wide">
                  {selectedTask.date
                    ? new Date(selectedTask.date).toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : "Select date"}
                </span>
              </div>

              <div className="min-w-[210px]">
                <AutocompleteInput
                  value={selectedTask.project || ""}
                  onChange={(newValue) =>
                    setSelectedTask({
                      ...selectedTask,
                      project: newValue,
                    })
                  }
                  projects={projects}
                  placeholder="No Project Set"
                />
              </div>
            </div>

            {/* ---- ACTION BUTTONS (Edit, Delete, Complete) ---- */}
            <div className="flex items-center gap-2">
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="text-white bg-white/5 border border-white/20 p-2 hover:border-cyan-500/30 rounded-xl transition-all duration-300 backdrop-blur-xl hover:bg-white/10"
                >
                  <Pencil size={15} />
                </button>
              ) : (
                <button
                  onClick={() => setEditMode(false)}
                  className="text-white bg-white/5 border border-white/20 p-2 hover:border-cyan-500/30 rounded-xl transition-all duration-300 backdrop-blur-xl hover:bg-white/10"
                >
                  <Eye size={15} />
                </button>
              )}

              <button
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="text-red-400 bg-red-500/10 border border-red-500/20 p-2 hover:border-red-500/40 rounded-xl transition-all duration-300 backdrop-blur-xl hover:bg-red-500/20"
              >
                <Trash2 size={15} />
              </button>
              <button
                onClick={() =>
                  handleCompleteTaskAction(selectedTask.id, !taskIsComplete)
                }
                className={`flex items-center gap-2 py-2 px-4 rounded-xl backdrop-blur-xl transition-all duration-300 
                  ${
                    taskIsComplete
                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                      : "bg-white/5 border border-white/20 text-white hover:border-green-500/30 hover:text-green-400"
                  }`}
              >
                <Check size={17} />
                <span className="text-sm font-light tracking-wider">
                  {taskIsComplete ? "Completed" : "Mark Complete"}
                </span>
              </button>
            </div>
          </div>

          {/* ---- DESCRIPTION (Edit or View) ---- */}
          <div
            className={`${
              editMode ? "max-h-[600px]" : "max-h-[400px]"
            } text-sm text-white mt-4 whitespace-pre-wrap overflow-y-auto scrollbar-hide`}
          >
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
                className="w-full bg-white/5 h-[594px] text-white whitespace-pre-wrap border border-white/10 hover:border-white/20 focus:white/30 rounded-lg focus:outline-none p-4 font-light tracking-wide transition-all duration-300 placeholder-cyan-200/30"
                placeholder="Enter task description"
                rows={5}
              />
            ) : selectedTask.description ? (
              <p className="my-3">
                {processTaskDescription(selectedTask.description)}
              </p>
            ) : (
              <span className="text-gray-400 italic">No description</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectedLocalTaskModal;
