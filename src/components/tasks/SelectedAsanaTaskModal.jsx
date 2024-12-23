import { CalendarIcon, Check, Eye, Pencil, Trash2 } from "lucide-react";
import AsanaLogoIcon from "../../assets/asana-logo.png";

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
          <img
            src={AsanaLogoIcon}
            alt="Asana Logo"
            className="w-8 mr-4 h-auto"
          />
          {/* Editable Title */}
          <input
            type="text"
            value={selectedTask.name}
            onChange={(e) =>
              setSelectedTask({
                ...selectedTask,
                name: e.target.value,
              })
            }
            className="text-white text-xl mr-1 truncate font-bold bg-transparent focus:outline-none"
            placeholder="Enter task title"
            onKeyDown={(e) => e.stopPropagation()}
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
            style={{ width: "100%" }}
          />
          <button
            className="text-center p-2 duration-100 rounded-full text-white text-2xl font-bold hover:text-gray-300 focus:outline-none"
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

        <div
          className={`p-6 overflow-y-auto ${
            editMode ? "h-[800px]" : "max-h-[800px]"
          }  custom-scrollbar`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm space-x-2 mb-4">
              <div
                onClick={handleContainerClick}
                className={`flex items-center space-x-2 px-3 py-2 rounded border cursor-pointer ${(() => {
                  if (!taskDueDate)
                    return "border-white/20 hover:border-white/40";
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const dueDate = new Date(taskDueDate);
                  dueDate.setHours(0, 0, 0, 0);
                  return dueDate < today
                    ? "border-red-500/50 hover:border-red-500/70"
                    : "border-white/20 hover:border-white/40";
                })()} transition-colors`}
              >
                <CalendarIcon
                  className={`w-4 h-4 pointer-events-none ${(() => {
                    if (!taskDueDate) return "text-white/50";
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDate = new Date(taskDueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    return dueDate < today
                      ? "text-red-500/70"
                      : "text-white/50";
                  })()}`}
                />
                <input
                  type="date"
                  ref={dateInputRef}
                  className="text-white bg-transparent border-none focus:outline-none cursor-pointer"
                  value={taskDueDate || ""}
                  onChange={(e) => handleTaskDateChange(e.target.value)}
                  style={{ visibility: "hidden", position: "absolute" }}
                />
                <span className="text-white" style={{ userSelect: "none" }}>
                  {taskDueDate
                    ? new Date(taskDueDate).toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : "Select a date"}
                </span>
              </div>

              {(() => {
                if (!taskDueDate) return null;
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const dueDate = new Date(taskDueDate);
                dueDate.setHours(0, 0, 0, 0);

                return dueDate < today ? (
                  <div className="bg-red-500/70 px-2 py-1 rounded-full text-xs">
                    Overdue
                  </div>
                ) : null;
              })()}
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
                      updateTasksCache(updatedTasks); // Update the cache
                      return updatedTasks;
                    });
                  } catch (err) {
                    console.error("Failed to delete task:", err);
                  }
                }}
                className="text-red-500 mr-2 border p-[7px] border-red-500/80 hover:border-red-500/40 rounded text-sm duration-200 flex items-center gap-1"
              >
                <Trash2 size={15} />
              </button>
              <button
                onClick={() => {
                  handleTaskComplete(!taskIsComplete);
                }}
                className={`flex items-center gap-2 py-1 px-2 rounded duration-200 text-sm ${
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

          <div className="">
            {!editMode ? (
              // Description
              <div
                className="mb-4 whitespace-pre-wrap text-white/80"
                style={{ height: "100%" }}
              >
                {replaceProfileLinks(selectedTask.notes)}
              </div>
            ) : (
              // Edit Mode
              <textarea
                value={selectedTask.notes}
                onChange={(e) =>
                  setSelectedTask({
                    ...selectedTask,
                    notes: e.target.value,
                  })
                }
                className="mb-4 whitespace-pre-wrap text-white/80 focus:outline-none bg-transparent w-full border h-[550px] p-2"
                placeholder="Enter task description"
                onKeyDown={(e) => e.stopPropagation()}
                onBlur={async () => {
                  try {
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
            )}
          </div>
          {/* Collaborators */}
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
