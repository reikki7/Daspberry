import React, { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { invoke } from "@tauri-apps/api/tauri";
import { FaCopy } from "react-icons/fa";
import {
  PlusCircle,
  Check,
  Trash2,
  BookCheck,
  CalendarIcon,
  CalendarCheck,
  Pencil,
  Eye,
  BookX,
  ChevronRight,
  ChevronLeft,
  ClipboardPenLine,
  ClipboardCheck,
  ClipboardPen,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { nightOwl } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Slide, ToastContainer, toast } from "react-toastify";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { formatDistanceToNow } from "date-fns";
import "react-toastify/dist/ReactToastify.css";
import eventBus from "../utils/eventBus";

const LocalTasks = ({ setIsTaskAvailable }) => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [completedTasksModalOpen, setCompletedTasksModalOpen] = useState(false);
  const [taskIsComplete, setTaskIsComplete] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [notification, setNotification] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    date: "",
    description: "",
    completed: false,
  });

  const dateInputRef = useRef(null);

  const ITEMS_PER_PAGE = 5;

  const saveTasks = async (updatedTasks) => {
    try {
      await invoke("save_local_tasks", { tasks: updatedTasks });
    } catch (error) {
      console.error("Error saving tasks:", error);
    }
  };

  const loadTasks = async () => {
    try {
      const loadedTasks = await invoke("load_local_tasks");
      if (Array.isArray(loadedTasks)) {
        setTasks(loadedTasks);
        console.log("Tasks loaded:", loadedTasks);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };
  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (tasks.length > 0) {
      saveTasks(tasks);
    }
  }, [tasks]);

  const handleContainerClick = () => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker?.();
      dateInputRef.current.click();
    }
  };

  const showNotification = (message, type = "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 2500);
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      showNotification("Task title cannot be empty.", "error");
      return;
    }
    setNewTaskModalOpen(false);

    const newTaskEntry = {
      id: uuidv4(),
      title: newTask.title,
      date: newTask.date || "",
      description: newTask.description,
      completed: false,
      completed_on: null,
    };

    const updatedTasks = [...tasks, newTaskEntry];
    setTasks(updatedTasks);

    try {
      await invoke("save_local_tasks", { tasks: updatedTasks });
      eventBus.emit("events_updated");
      console.log("Tasks saved successfully. Event emitted.");
    } catch (error) {
      console.error("Error saving tasks:", error);
    }

    setNewTask({ title: "", date: "", description: "" });
  };

  const processTaskDescription = (notes) => {
    if (!notes) return null;

    return notes
      .split(/(`{2}[\s\S]*?`{2}|https?:\/\/[^\s]+|\n|- )/g)
      .map((segment, index, array) => {
        const codeBlockMatch = segment.match(/`{2}(\w+)?\n([\s\S]*?)\n`{2}/);
        if (codeBlockMatch) {
          const language = codeBlockMatch[1]?.trim() || "text";
          const code = codeBlockMatch[2]?.trim();
          return (
            <div style={{ position: "relative" }} key={index}>
              <CopyToClipboard text={code}>
                <>
                  {isModalOpen && (
                    <button
                      onClick={() => setCopied(true)}
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        zIndex: 20,
                      }}
                    >
                      <FaCopy size={17} color={copied ? "#0be2a8" : "white"} />
                    </button>
                  )}
                </>
              </CopyToClipboard>
              <SyntaxHighlighter
                language={language}
                style={nightOwl}
                wrapLongLines={true}
                showLineNumbers={false}
                customStyle={{
                  padding: "1em",
                  borderRadius: "1em",
                  opacity: 0.9,
                }}
              >
                {code}
              </SyntaxHighlighter>
            </div>
          );
        }

        // Handle URLs
        if (segment.match(/https?:\/\/[^\s]+/)) {
          return (
            <a
              key={index}
              href={segment}
              className="text-blue-500 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {segment}
            </a>
          );
        }

        // Handle bullet points
        if (segment === "- ") {
          const nextSegment = array[index + 1]?.trim();
          if (nextSegment) {
            // Skip the next segment to avoid duplication
            array[index + 1] = "";
            return (
              <div key={index} className="flex items-start">
                <span className="mr-2 text-white">•</span>
                <span className="whitespace-pre-wrap">{nextSegment}</span>
              </div>
            );
          }
        }
        // Handle newlines - check if next segment is a bullet point
        if (segment === "\n") {
          const nextSegment = array[index + 1];
          if (nextSegment === "- ") {
            return null; // Skip the line break if next segment is a bullet point
          }
          return <br key={index} />;
        }

        // Handle newlines
        if (segment === "\n") {
          return <br key={index} />;
        }

        // Handle regular text or unmatched segments
        return (
          <span key={index} className="whitespace-pre-wrap">
            {segment}
          </span>
        );
      })
      .filter(Boolean);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask.title.trim()) {
      showNotification("Task title cannot be empty.", "error");
      return;
    }

    const updatedTasks = tasks.map((task) =>
      task.id === selectedTask.id ? selectedTask : task
    );
    setTasks(updatedTasks);
    eventBus.emit("events_updated");
    setSelectedTask(null);
    setErrorMessage("");

    try {
      await saveTasks(updatedTasks);
    } catch (error) {
      console.error("Error saving updated task:", error);
    }
  };

  const handleDeleteTask = async (id) => {
    const updatedTasks = tasks.filter((task) => task.id !== id);
    setTasks(updatedTasks);
    try {
      await saveTasks(updatedTasks);
      eventBus.emit("events_updated");
      showNotification("Task deleted successfully!", "success");
    } catch (error) {
      console.error("Error saving after deletion:", error);
    }
    eventBus.emit("events_updated");
    setSelectedTask(null);
  };

  const clearAllFields = () => {
    setNewTask({ title: "", date: "", description: "" });
    setNewTaskModalOpen(false);
    setSelectedTask(null);
    setErrorMessage("");
    setEditMode(false);
  };

  const closeNewTaskModal = () => {
    handleUpdateTask();
    setSelectedTask(null);
    setNewTaskModalOpen(false);
    setErrorMessage("");
    setEditMode(false);
    setCopied(false);
    setIsModalOpen(false);
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setTaskIsComplete(task.completed);
    setIsModalOpen(true);
  };

  const handleTaskComplete = (taskId, isComplete) => {
    const completed_on = isComplete ? new Date().toISOString() : null;

    // Update the task in the tasks array
    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? { ...task, completed: isComplete, completed_on: completed_on }
        : task
    );

    setTasks(updatedTasks);

    // Save updated tasks
    saveTasks(updatedTasks);

    // If the selectedTask is being updated, sync the state
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({
        ...selectedTask,
        completed: isComplete,
        completed_on: completed_on,
      });
      setTaskIsComplete(isComplete);
      deleteOldestCompletedTasks(tasks);
    }
    eventBus.emit("events_updated");
  };

  const deleteTaskById = (taskId) => {
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
    eventBus.emit("events_updated");
  };

  const deleteOldestCompletedTasks = (tasks) => {
    const completedTasks = tasks.filter((task) => task.completed_on);
    if (completedTasks.length > 20) {
      const sortedCompletedTasks = completedTasks.sort(
        (a, b) => new Date(a.completed_on) - new Date(b.completed_on)
      );
      const tasksToDelete = sortedCompletedTasks.slice(
        0,
        completedTasks.length - 20
      );
      tasksToDelete.forEach((task) => {
        deleteTaskById(task.id);
      });
    }
    eventBus.emit("events_updated");
  };

  // Pagination
  const totalPages = Math.ceil(
    tasks.filter((task) => !task.completed).length / ITEMS_PER_PAGE
  );

  const currentTasks = tasks
    .filter((task) => !task.completed)
    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  useEffect(() => {
    if (tasks.filter((task) => !task.completed).length > 0) {
      setIsTaskAvailable(true);
    } else {
      setIsTaskAvailable(false);
    }
  }, [tasks, setIsTaskAvailable]);

  const handleTitleChange = useCallback((e) => {
    setSelectedTask((prevTask) => ({
      ...prevTask,
      title: e.target.value,
    }));
    eventBus.emit("events_updated");
  }, []);

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2 items-center">
        <h1 className="text-2xl flex gap-1 items-center">
          <ClipboardPenLine />
          TODO
        </h1>
        <div className="flex">
          <button
            onClick={() => setCompletedTasksModalOpen(true)}
            className="text-white text-sm px-3 py-1 rounded-l-md bg-green-500/20 hover:bg-green-500/30 duration-300"
          >
            <BookCheck size={14} />
          </button>

          {/* Add Task Button */}
          <button
            onClick={() => setNewTaskModalOpen(true)}
            className="flex items-center gap-2 text-sm overflow-hidden bg-blue-500/20 hover:bg-purple-500/20 duration-300 text-white px-3 py-1 rounded-r-md"
          >
            <PlusCircle size={14} />
            <p className="mt-0.5">Add Task</p>
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="w-full pb-4">
        {tasks.filter((task) => !task.completed).length === 0 && (
          <div className="text-white text-center text-md my-3">
            No TODO found. Click "Add TODO" to create a new task.
          </div>
        )}
        <div
          className={` flex justify-between w-full ${
            tasks.filter((task) => !task.completed).length > 0 ? "h-72" : ""
          }`}
        >
          <div className="">
            <div className="flex h-full gap-4">
              {currentTasks.map((task) => (
                <button
                  key={task.id}
                  className="relative w-[239px] bg-gradient-to-br border hover:backdrop-blur-md bg-gray-950/30 backdrop-blur-lg p-2 text-left rounded-lg hover:bg-[#c08feb]/20 shadow-lg hover:shadow-xl transition-all border-none outline-none"
                  onClick={() => handleTaskClick(task)}
                >
                  {/* Header Section */}
                  <div className="mx-2 mt-1">
                    <h3 className="text-white text-wrap line-clamp-3 truncate">
                      {task.title}
                    </h3>
                    <div className="flex mt-3 justify-between">
                      <div className="text-[13px] text-white/70 flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2 -mt-0.5 text-white/50" />
                        {task.date
                          ? new Date(task.date).toLocaleDateString("en-ID", {
                              day: "2-digit",
                              month: "long",
                            })
                          : "No due date"}
                      </div>
                      {new Date(task.date) <
                        new Date(new Date().setHours(0, 0, 0, 0)) &&
                        task.date !== null && (
                          <div className="bg-red-500/70 px-2 py-1 rounded-full text-xs flex items-center">
                            Overdue
                          </div>
                        )}
                    </div>
                    <hr className="my-3 border-t border-gray-300/40" />
                  </div>

                  {/* Task Description */}
                  <div className="h-full mx-2 overflow-y-auto text-sm text-white/70 text-wrap whitespace-pre-wrap max-h-[170px]">
                    {processTaskDescription(task.description)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Only show up if there are more than 5 incomplete tasks */}
        {tasks.filter((task) => !task.completed).length > 5 && (
          <div className="flex items-center justify-center gap-6 mt-5">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="text-sm font-medium transition-colors disabled:opacity-50 disabled:hover:bg-gray-100/0 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  onClick={() => setCurrentPage(index + 1)}
                  key={index}
                  className={`h-2 w-2 rounded-full ${
                    index + 1 === currentPage ? "bg-teal-500" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="text-sm font-medium transition-colors disabled:opacity-50 disabled:hover:bg-gray-100/0 rounded-lg"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Task Modal */}
      {selectedTask && (
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
                        ? new Date(selectedTask.date).toLocaleDateString(
                            "en-US",
                            {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            }
                          )
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
      )}

      {/* New Task Modal */}
      {newTaskModalOpen && (
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
      )}

      {/* Completed Tasks Modal */}
      {completedTasksModalOpen && (
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
      )}
    </div>
  );
};

export default LocalTasks;
