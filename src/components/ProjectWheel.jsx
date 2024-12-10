import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { exists, readTextFile } from "@tauri-apps/api/fs";
import { open } from "@tauri-apps/api/shell";
import { Clock, Code } from "lucide-react";
import { FaReact, FaVuejs, FaGlobe, FaAngular, FaJava } from "react-icons/fa";
import { SiNextdotjs, SiSvelte } from "react-icons/si";
import { IoLogoJavascript } from "react-icons/io5";
import { BiLogoTypescript } from "react-icons/bi";
import { MdNotes } from "react-icons/md";
import {
  Github,
  FolderGit2,
  BriefcaseBusiness,
  RefreshCwIcon,
} from "lucide-react";
import ScaleLoader from "react-spinners/ScaleLoader";

import PythonIcon from "../assets/pythonIcon.png";
import VscodeIcon from "../assets/vscode-icon.webp";
import GithubIcon from "../assets/githubIcon.webp";
import JupyterIcon from "../assets/jupyter-icon.webp";

const ProjectWheel = () => {
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState("Projects");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const VISIBLE_ITEMS = 7;
  const TRANSITION_DURATION = 80;

  useEffect(() => {
    if (items.length === 0) {
      fetchFolders("D:\\Web Development\\Projects");
    }
  }, []);

  const fetchFolders = async (path) => {
    try {
      setLoading(true);
      const folders = await invoke("get_project_folders", { path });

      const folderItems = await Promise.all(
        folders.map(async (folder, index) => {
          const fullPath = `${path}\\${folder.name}`;
          const framework = await detectProjectType(fullPath);
          const lastModified = formatLastModified(folder.last_modified);

          return {
            id: index + 1,
            content: folder.name,
            path: fullPath,
            framework,
            lastModified,
            exiting: false,
          };
        })
      );

      setItems(folderItems);
    } catch (error) {
      console.error("Error fetching folders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRepositories = async () => {
    setCategory("Github");
    try {
      setLoading(true);

      let repos = [];
      let parsedCache = null;

      try {
        const cachedData = await invoke("read_github_repos_cache");
        parsedCache = JSON.parse(cachedData);

        // Check if cache is valid (e.g., within 24 hours)
        const isCacheValid =
          Date.now() - parsedCache.timestamp < 24 * 60 * 60 * 1000;
        if (isCacheValid) {
          repos = parsedCache.data;
        }
      } catch (error) {
        console.warn("Cache not found or invalid:", error);
      }

      if (repos.length === 0) {
        // Fetch from GitHub API if cache is invalid
        const response = await fetch(import.meta.env.VITE_GITHUB_API_URL);
        const data = await response.json();

        repos = data.map((repo, index) => ({
          id: index + 1,
          content: repo.name,
          path: repo.html_url,
          framework: repo.language || "Unknown",
          lastModified: formatLastModified(
            new Date(repo.pushed_at).getTime() / 1000
          ),
          exiting: false,
          description: repo.description,
        }));

        // Save to cache
        await invoke("cache_github_repos", {
          data: JSON.stringify({ timestamp: Date.now(), data: repos }),
        });
      }

      setItems(repos);
    } catch (error) {
      console.error("Error fetching repositories:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatLastModified = (timestamp) => {
    const now = Math.floor(Date.now() / 1000);
    const diffSeconds = now - timestamp;

    if (diffSeconds < 60) {
      return "just now";
    } else if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffSeconds < 86400) {
      const hours = Math.floor(diffSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffSeconds < 604800) {
      const days = Math.floor(diffSeconds / 86400);
      return `${days}d ago`;
    } else if (diffSeconds < 2592000) {
      const weeks = Math.floor(diffSeconds / 604800);
      return `${weeks}w ago`;
    } else {
      const date = new Date(timestamp * 1000);
      return date.toLocaleDateString();
    }
  };

  const detectProjectType = async (path) => {
    try {
      const hasPackageJson = await exists(`${path}/package.json`);
      if (hasPackageJson) {
        const packageJson = JSON.parse(
          await readTextFile(`${path}/package.json`)
        );
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        if (deps.next) return "Next.js";
        if (deps.react) return "React";
        if (deps.vue) return "Vue";
        if (deps.angular) return "Angular";
        if (deps.svelte) return "Svelte";
        if (deps.nuxt) return "Nuxt.js";
        if (deps.gatsby) return "Gatsby";
        if (deps.astro) return "Astro";
        if (deps.sapper) return "Sapper";
        if (deps["@sveltejs/kit"]) return "SvelteKit";
        return "JavaScript";
      }

      const hasFrontend =
        (await exists(`${path}/frontend`)) || (await exists(`${path}/client`));
      const hasBackend =
        (await exists(`${path}/backend`)) || (await exists(`${path}/server`));

      if (hasFrontend && hasBackend) return "Full Stack";
      if (hasFrontend) return "Frontend";
      if (hasBackend) return "Backend";

      return "Unknown";
    } catch (error) {
      console.error("Error detecting project type:", error);
      return "Unknown";
    }
  };

  const frameworkIcons = {
    React: <FaReact className="w-6 h-6 text-[#00d8ff]" />,
    Angular: <FaAngular className="w-8 h-8 text-red-500" />,
    Vue: <FaVuejs className="w-8 h-8 text-green-500" />,
    Svelte: <SiSvelte className="w-8 h-8 text-orange-500" />,
    "Next.js": <SiNextdotjs className="w-6 h-6 text-white" />,
    "Full Stack": <FaGlobe className="w-6 h-6 text-white-500" />,
    JavaScript: <IoLogoJavascript className="w-8 h-8 text-[#f7e018]" />,
    TypeScript: <BiLogoTypescript className="w-8 h-8 text-[#1573c0]" />,
    Python: <img src={PythonIcon} alt="Python" className="w-8 h-8" />,
    Java: <FaJava className="w-8 h-8 text-red-500" />,
    "Jupyter Notebook": (
      <img src={JupyterIcon} alt="Jupyter" className="w-8 h-8" />
    ),
    Unknown: <Code className="w-6 h-6 text-white-500" />,
  };

  const handleWheel = (event) => {
    if (transitioning || loading || items.length === 0) return;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    const delta = event.deltaY;
    const direction = delta > 0 ? 1 : -1;

    setTransitioning(true);

    const visibleItems = getVisibleItems();
    if (!visibleItems || visibleItems.length === 0) return;

    const exitingItemIndex = items.findIndex(
      (item) => item.id === visibleItems[0].id
    );
    if (exitingItemIndex === -1) return;

    const updatedItems = [...items];
    updatedItems[exitingItemIndex] = {
      ...updatedItems[exitingItemIndex],
      exiting: true,
    };
    setItems(updatedItems);

    setTimeout(() => {
      let newIndex = currentIndex + direction;
      if (newIndex < 0) {
        newIndex = items.length - 1;
      } else if (newIndex >= items.length) {
        newIndex = 0;
      }

      const resetItems = updatedItems.map((item) => ({
        ...item,
        exiting: false,
      }));
      setItems(resetItems);
      setCurrentIndex(newIndex);
      setTransitioning(false);
    }, TRANSITION_DURATION);
  };

  const getVisibleItems = () => {
    if (items.length === 0) return [];

    const visibleItems = [];
    const itemsToShow = transitioning ? VISIBLE_ITEMS + 1 : VISIBLE_ITEMS;

    for (let i = 0; i < Math.min(itemsToShow, items.length); i++) {
      const itemIndex = (currentIndex + i) % items.length;
      visibleItems.push(items[itemIndex]);
    }
    return visibleItems;
  };

  const toggleGithub = () => {
    if (category === "Github") {
      open("https://github.com/reikki7?tab=repositories");
    } else {
      fetchRepositories();
    }
  };

  const toggleProjectsButton = () => {
    if (category === "Projects") {
      open("D:\\Web Development\\Projects");
    } else {
      setCategory("Projects");
      fetchFolders("D:\\Web Development\\Projects");
    }
  };

  const toggleWorkButton = () => {
    if (category === "Work") {
      open("D:\\Web Development\\Work");
    } else {
      setCategory("Work");
      fetchFolders("D:\\Web Development\\Work");
    }
  };

  const resetGithubData = async () => {
    try {
      await invoke("cache_github_repos", { data: JSON.stringify({}) });
      fetchRepositories();
    } catch (error) {
      console.error("Failed to reset GitHub data:", error);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="mb-14 flex flex-col justify-center items-center w-1/4 relative">
        {category === "Github" && (
          <div>
            {/* Refetch Data */}
            <button
              onClick={resetGithubData}
              className="absolute bg-[#1d66f0] text-gray-950/40 rounded-bl-lg rounded-tr-lg rounded-br-3xl rounded-tl-3xl p-[9px] tp[-1 left-0"
            >
              <RefreshCwIcon size={15} color="white" />
            </button>
          </div>
        )}
        <div className="flex flex-col justify-center items-center w-full p-2 bg-gradient-to-r from-gray-950/10 via-blue-950/30 to-gray-950/10 rounded-2xl shadow-lg">
          <div className="flex flex-col gap-5 p-4 -mt-2">
            {/* GitHub Button */}
            <button
              onClick={toggleGithub}
              className="group relative flex flex-col items-center"
            >
              <div
                className={` p-4 rounded-xl transition-all duration-200 transform hover:scale-110 ${
                  category === "Github"
                    ? "scale-110 bg-[#1d66f0] hover:bg-[#1d66f0]/60 shadow-md"
                    : "bg-gray-950/50"
                } hover:shadow-md`}
              >
                <Github
                  className={`w-6 duration-200 group-hover:text-white h-6 ${
                    category === "Github" ? "text-white" : "text-white/80"
                  }`}
                />
              </div>
            </button>

            {/* Project Button */}
            <button
              onClick={toggleProjectsButton}
              className="group relative flex flex-col items-center"
            >
              <div
                className={`p-4 rounded-xl transition-all duration-200 transform hover:scale-110 ${
                  category === "Projects"
                    ? "scale-110 bg-[#c60dff]/80 hover:bg-[#c60dff]/60 shadow-md"
                    : "bg-gray-950/50 "
                } hover:shadow-md`}
              >
                <FolderGit2
                  className={`w-6 duration-200 group-hover:text-white h-6 ${
                    category === "Projects" ? "text-white" : "text-white/80"
                  }`}
                />
              </div>
            </button>

            {/* Work Button */}
            <button
              onClick={toggleWorkButton}
              className="group relative flex flex-col items-center"
            >
              <div
                className={`p-4 rounded-xl transition-all duration-200 transform hover:scale-110 ${
                  category === "Work"
                    ? "scale-110 bg-[#f0397b]/80 hover:bg-[#f0397b]/60 shadow-md"
                    : "bg-gray-950/50"
                } hover:shadow-md`}
              >
                <BriefcaseBusiness
                  className={`w-6 duration-200 group-hover:text-white h-6 ${
                    category === "Work" ? "text-white" : "text-white/80"
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {!loading ? (
        <div
          ref={containerRef}
          onWheel={handleWheel}
          className="h-[400px] overflow-hidden relative w-3/4 -mt-28"
        >
          {getVisibleItems().map((item, index) => {
            if (!item) return null;

            let positionClass = "scale-90 z-0 opacity-50 translate-y-[20px]";

            if (index === 0) {
              positionClass = item.exiting
                ? "scale-100 z-10 opacity-0 translate-y-[-20px]"
                : "scale-100 z-10 opacity-100";
            }

            function openFolderInVSCode(path) {
              invoke("open_folder_in_vscode", { path })
                .then(() => {})
                .catch((error) => {
                  console.error(
                    `Failed to open folder ${path} in VSCode:`,
                    error
                  );
                });
            }

            return (
              <button
                key={item.id}
                className={`absolute transition-all ml-4 hover:bg-gray-950/20 rounded-3xl duration-${TRANSITION_DURATION} transform ${positionClass}`}
                style={{
                  top: `${50 - (index - 1) * 70}px`,
                }}
                onClick={
                  category === "Github"
                    ? () => open(item.path)
                    : () => openFolderInVSCode(item.path)
                }
              >
                <div className="relative">
                  <div className="absolute inset-0 backdrop-blur-sm bg-black/5 rounded-3xl" />
                  <div className="relative bg-gradient-to-br from-gray-900/20 to-gray-950/40 rounded-3xl shadow-lg shadow-black/20 h-52 w-[410px] p-8 flex flex-col gap-4">
                    <div className="flex -mt-[6px] items-center gap-4">
                      {frameworkIcons[item.framework] || (
                        <FaGlobe className="w-6 h-6 text-gray-500" />
                      )}
                      <span className="text-white font-semibold text-xl truncate">
                        {item.content}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3 text-xs text-white/70">
                        <span className="bg-gray-950/40 rounded-full py-1 px-3">
                          {item.framework}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/70">
                        <Clock className="w-4 h-4" />
                        <span>
                          {category === "Github"
                            ? "Last Commit: "
                            : "Last modified: "}
                          {item.lastModified}
                        </span>
                      </div>
                      {item.description && (
                        <div className="flex items-start gap-3 text-xs text-white/70">
                          <div className="">
                            <MdNotes className="w-4 h-4" />
                          </div>
                          <span
                            className="text-xs text-left text-white/70 w-full mr-7"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.description}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-6 right-6">
                      <div>
                        <img
                          src={category === "Github" ? GithubIcon : VscodeIcon}
                          alt="VSCode"
                          className="w-6 h-6 shadow-xl"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        category === "Github" && (
          <div className="h-[400px] overflow-hidden relative w-3/4 -mt-24 flex items-center justify-center">
            <ScaleLoader color="#8dccff" />
          </div>
        )
      )}
    </div>
  );
};

export default ProjectWheel;
