import { toast } from "react-toastify";
import { PlusCircle, CalendarIcon } from "lucide-react";
import CustomDropdown from "./CustomDropdown";
import AsanaLogoIcon from "../../assets/asana-logo.png";

const NewAsanaTaskModal = ({
  newTask,
  setNewTask,
  clearAllFields,
  handleContainerClick,
  dateInputRef,
  setNewTaskModalOpen,
  assigneeList,
  selectedAssignee,
  setSelectedAssignee,
  defaultAssignee,
  addTask,
}) => {
  return (
    <div className="fixed rounded-3xl inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-50 px-4 py-8">
      <div className="bg-gray-950/60 rounded-lg overflow-hidden max-w-4xl w-full max-h-full flex flex-col">
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
            value={newTask.name}
            onChange={(e) =>
              setNewTask({
                ...newTask,
                name: e.target.value,
              })
            }
            style={{ width: "100%" }}
            onKeyDown={(e) => e.stopPropagation()}
            className="text-white text-xl font-bold bg-transparent focus:outline-none"
            placeholder="Enter task title"
          />
          <button
            className="text-center p-2 duration-100 rounded-full text-white text-2xl font-bold hover:text-gray-300 focus:outline-none"
            onClick={() => {
              clearAllFields();
              setSelectedAssignee(defaultAssignee);
            }}
          >
            &times;
          </button>
        </div>

        <div className="p-6 overflow-y-auto h-[800px] custom-scrollbar">
          <div className="relative flex justify-between text-sm mb-4 group">
            <div
              className="flex items-center space-x-2 px-3 py-2 cursor-pointer rounded border border-white/20 hover:border-white/40 transition-colors"
              onClick={handleContainerClick}
            >
              <CalendarIcon className="w-4 h-4 text-white/50 pointer-events-none" />
              <input
                type="date"
                ref={dateInputRef}
                style={{ visibility: "hidden", position: "absolute" }}
                className="text-white bg-transparent border-none focus:outline-none"
                value={newTask.due_on}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    due_on: e.target.value,
                  })
                }
                onKeyDown={(e) => e.stopPropagation()}
              />
              <span className="text-white" style={{ userSelect: "none" }}>
                {newTask.due_on
                  ? new Date(newTask.due_on).toLocaleDateString("en-US", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "Select a date"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <CustomDropdown
                  assignees={assigneeList}
                  selectedAssignee={selectedAssignee}
                  setSelectedAssignee={setSelectedAssignee}
                />
              </div>
              <button
                onClick={async () => {
                  toast.dismiss();
                  try {
                    if (!newTask.name.trim()) {
                      toast.error("Task title cannot be empty.", {
                        position: "top-center",
                        closeOnClick: true,
                        theme: "dark",
                        toastId: "task-title-empty",
                      });
                      return;
                    }
                    setNewTaskModalOpen(false);
                    await addTask(selectedAssignee);
                  } catch (err) {
                    console.error("Failed to add task:", err);
                  }
                }}
                className="bg-cyan-500/50 hover:bg-blue-500/50 duration-300 rounded-full text-white px-4 py-2 flex items-center"
              >
                <PlusCircle size={20} className="mr-2" />
                <p className="text-sm mt-0.5">Add Task</p>
              </button>
            </div>
          </div>

          <div
            className="h-full"
            style={{ height: "calc(100% - 60px)", minHeight: "200px" }}
          >
            <textarea
              value={newTask.notes}
              onChange={(e) =>
                setNewTask({
                  ...newTask,
                  notes: e.target.value,
                })
              }
              className="w-full h-full bg-transparent text-white text-sm whitespace-pre-wrap border border-white/20 focus:border-white/40 rounded focus:outline-none p-2"
              placeholder="Enter task description"
              rows={5}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewAsanaTaskModal;
