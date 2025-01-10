import React, { useState, useEffect } from "react";
import { CalendarIcon, Check, Eye, Pencil, Trash2 } from "lucide-react";
import AsanaLogoIcon from "../../assets/asana-logo-icon.png";
import { ClipLoader } from "react-spinners";

const SelectedAsanaTaskModal = ({
  selectedTask,
  setSelectedTask,
  taskDueDate,
  handleTaskDateChange,
  closeModal,
  setEditMode,
  editMode,
  setTasks,
  tasks,
  updateTask,
  asanaApiKey,
  updateTasksCache,
  handleTaskComplete,
  taskIsComplete,
  toast,
  replaceProfileLinks,
  dateInputRef,
  handleContainerClick,
}) => {
  const [loadingComplete, setLoadingComplete] = useState(false);
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const handleTaskCompleteClick = async (isComplete) => {
    setLoadingComplete(true); // Show spinner
    try {
      await handleTaskComplete(isComplete); // Execute the completion logic
    } catch (err) {
      console.error("Failed to complete task:", err);
      toast.error("Failed to update task completion.", {
        position: "top-center",
        toastId: "task-complete-error",
      });
    } finally {
      setLoadingComplete(false); // Hide spinner
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleTaskComplete, closeModal]);

  return (
    <div
      className="fixed rounded-3xl overflow-hidden inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 px-4 py-8"
      onClick={handleOverlayClick}
    >
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
            <img
              src={AsanaLogoIcon}
              alt="Asana Logo"
              className="w-8 mr-4 h-auto"
            />
            <input
              type="text"
              value={selectedTask.name}
              onChange={(e) =>
                setSelectedTask({
                  ...selectedTask,
                  name: e.target.value,
                })
              }
              className="text-cyan-50 text-xl mr-10 truncate font-light tracking-wide bg-transparent focus:outline-none transition-colors placeholder-cyan-200/30"
              placeholder="Enter task title"
              onKeyDown={(e) => e.stopPropagation()}
              style={{ width: "100%" }}
              onBlur={async () => {
                try {
                  if (!selectedTask.name.trim()) {
                    return;
                  }
                  await updateTask(selectedTask.gid, {
                    name: selectedTask.name,
                    notes: selectedTask.notes,
                    due_on: taskDueDate,
                  });
                  setTasks(
                    tasks?.map((task) =>
                      task?.gid === selectedTask.gid ? selectedTask : task
                    )
                  );
                } catch (err) {
                  console.error("Failed to save task:", err);
                }
              }}
            />
            <button
              className="absolute right-0 text-center p-2 pb-3 rounded-full text-white text-2xl  focus:outline-none hover:rotate-90 duration-300"
              style={{ userSelect: "none" }}
              onClick={() => {
                toast.dismiss();
                if (!selectedTask.name.trim()) {
                  toast.error("Task title cannot be empty.", {
                    position: "top-center",
                    closeOnClick: true,
                    theme: "dark",
                    toastId: "task-title-empty",
                  });
                  return;
                }
                closeModal();
                setEditMode(false);
              }}
            >
              &times;
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto scrollbar-hide">
          <div className="relative flex justify-between text-sm mb-4 group">
            <div
              onClick={handleContainerClick}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border cursor-pointer ${(() => {
                if (!taskDueDate)
                  return "border-white/20 hover:border-white/40";
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dueDate = new Date(taskDueDate);
                dueDate.setHours(0, 0, 0, 0);
                return dueDate < today
                  ? "border-red-500/60 text-red-400 hover:border-red-500/80"
                  : "border-white/20 text-white  hover:border-white/40";
              })()} transition-colors bg-white/5`}
            >
              <CalendarIcon
                className={`w-4 h-4 ${
                  taskDueDate &&
                  new Date(taskDueDate) < new Date().setHours(0, 0, 0, 0)
                    ? "text-red-400"
                    : "text-cyan-400"
                } pointer-events-none`}
              />
              <input
                type="date"
                ref={dateInputRef}
                className="text-cyan-50 bg-transparent border-none focus:outline-none"
                value={taskDueDate || ""}
                onChange={(e) => handleTaskDateChange(e.target.value)}
                style={{ visibility: "hidden", position: "absolute" }}
              />
              <span className="font-light tracking-wide">
                {taskDueDate
                  ? new Date(taskDueDate).toLocaleDateString("en-US", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "Select a date"}
              </span>
            </div>

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
                onClick={async () => {
                  closeModal();
                  try {
                    await fetch(
                      `https://app.asana.com/api/1.0/tasks/${selectedTask.gid}`,
                      {
                        method: "DELETE",
                        headers: {
                          accept: "application/json",
                          authorization: `Bearer ${asanaApiKey}`,
                        },
                      }
                    );
                    setTasks((prevTasks) => {
                      const updatedTasks = prevTasks.filter(
                        (task) => task.gid !== selectedTask.gid
                      );
                      updateTasksCache(updatedTasks);
                      return updatedTasks;
                    });
                  } catch (err) {
                    console.error("Failed to delete task:", err);
                  }
                }}
                className="text-red-400 bg-red-500/10 border border-red-500/20 p-2 hover:border-red-500/40 rounded-xl transition-all duration-300 backdrop-blur-xl hover:bg-red-500/20"
              >
                <Trash2 size={15} />
              </button>
              <button
                onClick={() => handleTaskCompleteClick(!taskIsComplete)}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl backdrop-blur-xl transition-all duration-300 ${
                  taskIsComplete
                    ? "bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                    : "bg-white/5 border border-white/20 text-white hover:border-green-500/30 hover:text-green-400"
                }`}
                disabled={loadingComplete} // Disable while loading
              >
                {loadingComplete ? (
                  <>
                    <ClipLoader size={17} color="white" />
                    <span className="text-sm font-light tracking-wider">
                      {taskIsComplete ? "Completed" : "Mark Complete"}
                    </span>
                  </>
                ) : (
                  <>
                    <Check size={17} />
                    <span className="text-sm font-light tracking-wider">
                      {taskIsComplete ? "Completed" : "Mark Complete"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div
            className={`text-sm text-white mt-4 whitespace-pre-wrap overflow-auto ${
              editMode ? "max-h-[600px] h-auto" : "max-h-[400px]"
            }`}
          >
            {!editMode ? (
              <p className="whitespace-pre-wrap my-3">
                {replaceProfileLinks(selectedTask.notes)}
              </p>
            ) : (
              <textarea
                value={selectedTask.notes}
                onChange={(e) =>
                  setSelectedTask({
                    ...selectedTask,
                    notes: e.target.value,
                  })
                }
                className="w-full bg-white/5 h-[594px] text-white whitespace-pre-wrap border border-white/10 hover:border-white/20 focus:border-white/30 rounded-lg focus:outline-none p-4 font-light tracking-wide transition-all duration-300 placeholder-cyan-200/30"
                placeholder="Enter task description"
                rows={5}
                onKeyDown={(e) => e.stopPropagation()}
              />
            )}
          </div>

          <hr className="my-5 border-t border-gray-300/40" />
          <h3 className="text-md font-semibold">Collaborators</h3>
          <div className="flex items-center gap-2 mt-4">
            {selectedTask?.followers?.map((follower) => (
              <div
                key={follower.gid}
                className="flex items-center text-sm gap-1 border bg-blue-950/40 text-white px-4 py-1.5 rounded-full"
              >
                <p>{follower.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectedAsanaTaskModal;
