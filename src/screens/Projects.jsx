import React, { useEffect, useState, useRef, lazy, Suspense } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Link } from "react-router-dom";

// Lazy-load the modal for individual task editing
const SelectedLocalTaskModal = lazy(() =>
  import("../components/local-tasks/SelectedLocalTaskModal")
);

const Projects = () => {
  const [tasks, setTasks] = useState([]);
  const [groupedTasks, setGroupedTasks] = useState({});

  const [selectedTask, setSelectedTask] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const dateInputRef = useRef(null);

  useEffect(() => {
    // Preload the modal as soon as component mounts
    import("../components/local-tasks/SelectedLocalTaskModal");

    // Load tasks from Tauri
    const fetchTasks = async () => {
      try {
        const loadedTasks = await invoke("load_local_tasks");
        if (Array.isArray(loadedTasks)) {
          setTasks(loadedTasks);
        }
      } catch (error) {
        console.error("Error loading tasks:", error);
      }
    };
    fetchTasks();
  }, []);

  // Group tasks by project
  useEffect(() => {
    const groups = tasks.reduce((acc, task) => {
      if (task.completed) return acc; // skip completed tasks
      if (!task.project) return acc; // skip tasks with no project
      if (!acc[task.project]) acc[task.project] = [];
      acc[task.project].push(task);
      return acc;
    }, {});
    setGroupedTasks(groups);
  }, [tasks]);

  const renameProject = async (oldProjectName, newProjectName) => {
    // Guard: skip if empty or same name
    if (!newProjectName.trim() || newProjectName === oldProjectName) return;

    const updatedTasks = tasks.map((t) =>
      t.project === oldProjectName
        ? { ...t, project: newProjectName.trim() }
        : t
    );
    setTasks(updatedTasks);

    // Save updated tasks to Tauri
    try {
      await invoke("save_local_tasks", { tasks: updatedTasks });
    } catch (error) {
      console.error("Error saving renamed project tasks:", error);
    }
  };

  // --- INDIVIDUAL TASK MODAL LOGIC ---
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setEditMode(false);
    setErrorMessage("");
  };

  const handleUpdateTask = async () => {
    if (!selectedTask.title.trim()) {
      setErrorMessage("Task title cannot be empty.");
      return;
    }

    const updatedTasks = tasks.map((t) =>
      t.id === selectedTask.id ? selectedTask : t
    );
    setTasks(updatedTasks);

    try {
      await invoke("save_local_tasks", { tasks: updatedTasks });
    } catch (error) {
      console.error("Error saving tasks:", error);
    }

    // Reset modal state
    setSelectedTask(null);
    setEditMode(false);
  };

  const handleDeleteTask = async (id) => {
    const updatedTasks = tasks.filter((t) => t.id !== id);
    setTasks(updatedTasks);

    try {
      await invoke("save_local_tasks", { tasks: updatedTasks });
    } catch (error) {
      console.error("Error deleting task:", error);
    }

    setSelectedTask(null);
    setEditMode(false);
  };

  const handleTaskComplete = async (taskId, isComplete) => {
    const completed_on = isComplete ? new Date().toISOString() : null;
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, completed: isComplete, completed_on } : t
    );
    setTasks(updatedTasks);

    try {
      await invoke("save_local_tasks", { tasks: updatedTasks });
    } catch (error) {
      console.error("Error marking task complete:", error);
    }

    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => ({
        ...prev,
        completed: isComplete,
        completed_on,
      }));
    }
  };

  const handleContainerClick = () => {
    if (dateInputRef.current && dateInputRef.current.showPicker) {
      dateInputRef.current.showPicker();
    }
  };

  const closeModal = () => {
    setSelectedTask(null);
    setEditMode(false);
    setErrorMessage("");
  };

  return (
    <div
      className={`text-white ${
        Object.keys(groupedTasks).length === 0 && "-mt-16"
      }`}
    >
      {/* Check if there are no projects */}
      {Object.keys(groupedTasks).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-screen">
          {/* Icon */}
          <div className="bg-cyan-600/10 text-cyan-400 p-4 rounded-full shadow-lg mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9.75 11L12 13.25L14.25 11M12 6V13.25M15.75 9.75L19.5 6.5M8.25 9.75L4.5 6.5M8.25 14.25L4.5 17.5M15.75 14.25L19.5 17.5"
              />
            </svg>
          </div>
          {/* Message */}
          <h1 className="text-3xl font-bold text-gray-200 mb-2">
            No Ongoing Projects
          </h1>
          <p className="text-gray-400 text-lg text-center max-w-md">
            It seems like you don’t have any active projects. Assign a task to a
            project and they will show up here!
          </p>
          {/* Call-to-Action Button */}
          <Link
            to="/tasks"
            className="mt-6 px-6 py-3 bg-cyan-500/30 text-white font-medium rounded-full shadow-md hover:bg-cyan-700 transition duration-300"
          >
            Go to Tasks
          </Link>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 w-full space-y-5">
          {Object.entries(groupedTasks).map(([projectName, projectTasks]) => (
            <ProjectCard
              key={projectName}
              projectName={projectName}
              projectTasks={projectTasks}
              renameProject={renameProject}
              handleTaskClick={handleTaskClick}
            />
          ))}
        </div>
      )}

      <Suspense>
        {selectedTask && (
          <SelectedLocalTaskModal
            selectedTask={selectedTask}
            setSelectedTask={setSelectedTask}
            handleTitleChange={(e) =>
              setSelectedTask((prev) => ({ ...prev, title: e.target.value }))
            }
            handleUpdateTask={handleUpdateTask}
            closeNewTaskModal={closeModal}
            errorMessage={errorMessage}
            editMode={editMode}
            setEditMode={setEditMode}
            handleContainerClick={handleContainerClick}
            dateInputRef={dateInputRef}
            handleDeleteTask={handleDeleteTask}
            taskIsComplete={selectedTask.completed}
            handleTaskComplete={handleTaskComplete}
            processTaskDescription={(text) => text}
            projects={[...new Set(tasks.map((t) => t.project).filter(Boolean))]}
          />
        )}
      </Suspense>
    </div>
  );
};

// ProjectCard subcomponent: inline-edit for project name + task list
function ProjectCard({
  projectName,
  projectTasks,
  renameProject,
  handleTaskClick,
}) {
  const [editing, setEditing] = useState(false);
  const [tempName, setTempName] = useState(projectName);

  // handleBlurOrSubmit => called on blur or pressing Enter
  const handleBlurOrSubmit = () => {
    renameProject(projectName, tempName);
    setEditing(false);
  };

  return (
    <div
      className="break-inside-avoid w-full
                 bg-gradient-to-br from-white/5 to-black/10
                 backdrop-blur-md border border-white/10 rounded-xl
                 shadow-lg p-4 mb-5
                 hover:border-cyan-500/30 hover:shadow-cyan-700/30
                 transition-all duration-300"
    >
      {/* Inline-editable project title */}
      {editing ? (
        <input
          className="bg-transparent border-b border-cyan-400
                     focus:outline-none focus:border-cyan-500
                      text-xl font-semibold mb-3 w-full
                     transition-colors"
          value={tempName}
          autoFocus
          onChange={(e) => setTempName(e.target.value)}
          onBlur={handleBlurOrSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleBlurOrSubmit();
            }
          }}
        />
      ) : (
        <h2
          className="text-xl font-semibold mb-3 bg-gradient-to-r from-cyan-200 via-white to-white bg-clip-text text-transparent cursor-pointer"
          onDoubleClick={() => setEditing(true)}
          title="Double-click to rename project"
        >
          {projectName}
        </h2>
      )}

      {/* Tasks List */}
      <ul className="space-y-2">
        {projectTasks.map((task) => (
          <li
            key={task.id}
            className="text-sm text-gray-100
                       bg-white/5 px-3 py-2 rounded-md
                       hover:bg-cyan-500/20 transition-colors
                       cursor-pointer"
            onClick={() => handleTaskClick(task)}
          >
            {task.title || "Untitled Task"}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Projects;
