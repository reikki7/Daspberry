import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { PlusCircle, CalendarIcon } from "lucide-react";
import CustomDropdown from "./CustomDropdown";
import AsanaLogoIcon from "../../assets/asana-logo-icon.png";

import eventBus from "../../utils/eventBus";

const asanaApiKey = import.meta.env.VITE_ASANA_API_KEY;
const asanaWorkspaceGid = import.meta.env.VITE_ASANA_WORKSPACE_GID;
const defaultAssignee = import.meta.env.VITE_ASANA_DEFAULT_ASSIGNEE;

const NewAsanaTaskModal = ({
  handleContainerClick,
  dateInputRef,
  setNewTaskModalOpen,
  users,
  updateTasksCache,
  setTasks,
  fetchTasks,
}) => {
  const [assigneeList, setAssigneeList] = useState([]);
  const [newTask, setNewTask] = useState({
    name: "",
    notes: "",
    due_on: "",
  });
  const [selectedAssignee, setSelectedAssignee] = useState(
    defaultAssignee || ""
  );

  useEffect(() => {
    setAssigneeList(users);
  }, []);

  const addTask = async (assignee) => {
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

      const taskData = {
        data: {
          name: newTask.name,
          notes: newTask.notes || "",
          due_on: newTask.due_on || null,
          workspace: asanaWorkspaceGid,
          assignee: assignee,
        },
      };

      const response = await fetch(
        "https://app.asana.com/api/1.0/tasks?opt_fields=name,due_on,notes",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${asanaApiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(taskData),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setTasks((prevTasks) => {
          const updatedTasks = [...prevTasks, result.data];
          updateTasksCache(updatedTasks);
          eventBus.emit("events_updated");
          return updatedTasks;
        });
        fetchTasks("network");
      } else {
        const errorData = await response.json();
        console.error("Failed to create task:", errorData);
        alert("Failed to create task. Check console for details.");
      }
    } catch (err) {
      console.error("Error creating task:", err);
      alert("An error occurred while creating the task.");
    }
  };

  const clearAllFields = () => {
    setNewTask({ name: "", notes: "", due_on: "" });
    setNewTaskModalOpen(false);
    setSelectedAssignee(null);
    toast.dismiss();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      clearAllFields();
      setNew;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setNewTaskModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setNewTaskModalOpen]);

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
              value={newTask.name}
              onChange={(e) =>
                setNewTask({
                  ...newTask,
                  name: e.target.value,
                })
              }
              style={{ width: "100%" }}
              onKeyDown={(e) => e.stopPropagation()}
              className="text-cyan-50 text-xl font-light mr-8 truncate tracking-wide bg-transparent focus:outline-none transition-colors placeholder-cyan-200/30"
              placeholder="Enter task title"
            />
            <button
              className="absolute right-0 text-center p-2 rounded-full text-white text-2xl hover:rotate-90 duration-300 focus:outline-none"
              onClick={() => {
                clearAllFields();
                setSelectedAssignee(defaultAssignee);
              }}
              style={{ userSelect: "none" }}
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
              <span className="text-cyan-100 font-light tracking-wide">
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
                className="px-6 py-2 rounded-lg flex bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 hover:text-white border border-cyan-400 transition-all duration-300"
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
              className="w-full h-full bg-white/5 text-cyan-100 text-sm whitespace-pre-wrap border border-white/10 hover:border-white/20 focus:white rounded-lg focus:outline-none p-4 font-light tracking-wide transition-all duration-300 placeholder-cyan-200/30"
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
