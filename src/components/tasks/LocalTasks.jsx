import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  lazy,
  Suspense,
  useMemo,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { invoke } from "@tauri-apps/api/tauri";
import { FaCopy } from "react-icons/fa";
import { PlusCircle, BookCheck, ClipboardPenLine } from "lucide-react";

const SyntaxHighlighter = lazy(() =>
  import("react-syntax-highlighter").then((module) => ({
    default: module.Prism,
  }))
);
import { nightOwl } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Slide, ToastContainer, toast } from "react-toastify";
import { CopyToClipboard } from "react-copy-to-clipboard";
import "react-toastify/dist/ReactToastify.css";
import eventBus from "../../utils/eventBus";

import LocalTaskList from "./LocalTaskList";

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

  const SelectedLocalTaskModal = React.lazy(() =>
    import("./SelectedLocalTaskModal")
  );
  const NewLocalTaskModal = React.lazy(() => import("./NewLocalTaskModal"));
  const CompletedLocalTaskModal = React.lazy(() =>
    import("./CompletedLocalTaskModal")
  );

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
              <Suspense fallback={null}>
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
              </Suspense>
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
    eventBus.emit("events_updated");
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

  const totalIncompleteTasks = tasks.filter((task) => !task.completed).length;

  // Pagination
  const totalPages = Math.ceil(
    tasks.filter((task) => !task.completed).length / ITEMS_PER_PAGE
  );

  const currentTasks = useMemo(() => {
    return tasks
      .filter((task) => !task.completed)
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime() || Infinity;
        const dateB = new Date(b.date).getTime() || Infinity;

        const now = new Date().getTime();

        const isOverdueA = dateA < now;
        const isOverdueB = dateB < now;

        if (isOverdueA && !isOverdueB) return -1;
        if (!isOverdueA && isOverdueB) return 1;

        return dateA - dateB;
      })
      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE); // Paginate
  }, [tasks, currentPage]);

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
      <LocalTaskList
        tasks={currentTasks}
        handleTaskClick={handleTaskClick}
        currentPage={currentPage}
        totalPages={totalPages}
        goToPreviousPage={goToPreviousPage}
        goToNextPage={goToNextPage}
        setCurrentPage={setCurrentPage}
        totalIncompleteTasks={totalIncompleteTasks}
      />

      <Suspense fallback={null}>
        {/* Task Modal */}
        {selectedTask && (
          <SelectedLocalTaskModal
            selectedTask={selectedTask}
            setSelectedTask={setSelectedTask}
            taskIsComplete={taskIsComplete}
            setTaskIsComplete={setTaskIsComplete}
            errorMessage={errorMessage}
            setErrorMessage={setErrorMessage}
            editMode={editMode}
            setEditMode={setEditMode}
            handleTitleChange={handleTitleChange}
            handleUpdateTask={handleUpdateTask}
            handleDeleteTask={handleDeleteTask}
            clearAllFields={clearAllFields}
            closeNewTaskModal={closeNewTaskModal}
            handleTaskComplete={handleTaskComplete}
            processTaskDescription={processTaskDescription}
          />
        )}

        {/* New Task Modal */}
        {newTaskModalOpen && (
          <NewLocalTaskModal
            newTask={newTask}
            setNewTask={setNewTask}
            handleAddTask={handleAddTask}
            clearAllFields={clearAllFields}
            setNewTaskModalOpen={setNewTaskModalOpen}
            dateInputRef={dateInputRef}
            handleContainerClick={handleContainerClick}
            processTaskDescription={processTaskDescription}
          />
        )}

        {/* Completed Tasks Modal */}
        {completedTasksModalOpen && (
          <CompletedLocalTaskModal
            tasks={tasks}
            setCompletedTasksModalOpen={setCompletedTasksModalOpen}
            handleTaskComplete={handleTaskComplete}
            processTaskDescription={processTaskDescription}
          />
        )}
      </Suspense>
    </div>
  );
};

export default LocalTasks;
