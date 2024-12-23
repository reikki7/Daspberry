import { ExternalLink } from "lucide-react";

const SelectedLocalEventModal = ({
  selectedEvent,
  setEditableEvent,
  handleEditChange,
  handleSave,
  handleDelete,
  startDateRef,
  endDateRef,
  timeStartRef,
  timeEndRef,
  showPreview,
  setShowPreview,
  editableEvent,
  setSelectedEvent,
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 rounded-3xl bg-black/70 backdrop-blur-sm"></div>

      {/* Modal Container */}
      <div
        data-tauri-drag-region
        className="relative bg-slate-900/20 backdrop-blur-sm rounded-xl p-8 w-full max-w-lg border border-cyan-500/20 shadow-2xl shadow-cyan-500/20"
      >
        <button
          onClick={() => {
            setShowPreview(true);
            setSelectedEvent(null);
          }}
          className="px-3 py-1 absolute top-2 right-2 rounded-lg bg-slate-800/80 text-cyan-400 border border-cyan-500/30 hover:bg-slate-700/80 hover:border-cyan-400 transition-all duration-300"
        >
          <span className="block text-md">x</span>
        </button>
        {/* Decorative Corners */}
        <div className="absolute top-0 left-0 w-10 h-10 border-l border-t border-cyan-400 rounded-tl-lg"></div>
        <div className="absolute bottom-0 right-0 w-10 h-10 border-r border-b border-cyan-400 rounded-br-lg"></div>

        {/* Header */}
        <div className="mb-6">
          <input
            type="text"
            name="title"
            value={editableEvent.title || selectedEvent.title}
            onChange={handleEditChange}
            placeholder="Event Title"
            className="w-full text-2xl font-bold text-white text-center bg-transparent border-none outline-none placeholder-gray-400"
            onKeyDown={(e) => {
              e.stopPropagation();
            }}
          />
        </div>

        {/* Location */}
        <div className="mb-4">
          <input
            type="text"
            name="location"
            value={editableEvent.location || ""}
            onChange={handleEditChange}
            placeholder="Event Location"
            className="w-full placeholder:italic text-sm text-cyan-400 text-center bg-transparent border-none outline-none placeholder-gray-400"
            onKeyDown={(e) => {
              e.stopPropagation();
            }}
          />
        </div>

        {/* Description */}
        <div className="mb-6 relative">
          <div className="absolute top-2 right-2 z-10 flex space-x-2">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="bg-cyan-500/20 text-cyan-200 px-2 py-1 rounded-md text-xs hover:bg-cyan-500/30 transition-all"
            >
              {showPreview ? "Edit" : "Preview"}
            </button>
          </div>
          {!showPreview ? (
            <textarea
              name="description"
              placeholder="Event Notes"
              value={editableEvent.description || ""}
              onChange={handleEditChange}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              className="w-full bg-slate-800/50 h-96 text-cyan-50 p-3 rounded-lg border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-cyan-200/30 transition-all outline-none resize-none"
            />
          ) : (
            <div className="w-full bg-slate-800/50 h-96 text-cyan-50 p-3 rounded-lg border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-cyan-200/30 transition-all outline-none resize-none">
              <span>
                <span>
                  {editableEvent.description ? (
                    editableEvent.description.split("\n").map((line, index) => {
                      if (line.startsWith("- ")) {
                        // Bullet point
                        return (
                          <li key={index} className="list-disc ml-5 text-white">
                            {line.substring(2)}
                          </li>
                        );
                      } else if (line.startsWith("### ")) {
                        // Heading level 3
                        return (
                          <h3
                            key={index}
                            className="text-lg font-semibold text-white mt-2"
                          >
                            {line.substring(4)}
                          </h3>
                        );
                      } else if (line.startsWith("## ")) {
                        // Heading level 2
                        return (
                          <h2
                            key={index}
                            className="text-xl font-bold text-white mt-4"
                          >
                            {line.substring(3)}
                          </h2>
                        );
                      } else if (line.startsWith("# ")) {
                        // Heading level 1
                        return (
                          <h1
                            key={index}
                            className="text-2xl font-extrabold text-white mt-6"
                          >
                            {line.substring(2)}
                          </h1>
                        );
                      } else {
                        // Regular paragraph
                        return (
                          <p key={index} className="text-base text-white mt-1">
                            {line}
                          </p>
                        );
                      }
                    })
                  ) : (
                    <span className="italic text-gray-400">No description</span>
                  )}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Date Picker */}
        <div className="flex items-center justify-between text-sm text-gray-300 gap-4">
          {/* Start Date */}
          <div
            className="flex-1 cursor-pointer bg-slate-800/50 border border-cyan-500/30 p-2 rounded-lg hover:border-cyan-400 transition-all"
            onClick={() => handleContainerClick(startDateRef)}
          >
            <label className="block mb-1 text-cyan-400 text-sm">
              Start Date
            </label>
            <input
              type="date"
              ref={startDateRef}
              value={editableEvent.date_start || ""}
              onChange={(e) => {
                const newStartDate = e.target.value;
                setEditableEvent((prev) => ({
                  ...prev,
                  date_start: newStartDate,
                  date_end:
                    newStartDate &&
                    prev.date_end &&
                    new Date(prev.date_end) < new Date(newStartDate)
                      ? newStartDate
                      : prev.date_end,
                }));
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              className="w-full bg-transparent text-white outline-none"
            />
          </div>

          {/* End Date */}
          <div
            className="flex-1 cursor-pointer bg-slate-800/50 border border-cyan-500/30 p-2 rounded-lg hover:border-cyan-400 transition-all"
            onClick={() => handleContainerClick(endDateRef)}
          >
            <label className="block mb-1 text-cyan-400 text-sm">End Date</label>
            <input
              type="date"
              ref={endDateRef}
              value={editableEvent.date_end || ""}
              onChange={(e) => {
                const newEndDate = e.target.value;
                setEditableEvent((prev) => ({
                  ...prev,
                  date_end: newEndDate,
                  date_start:
                    newEndDate &&
                    new Date(newEndDate) < new Date(prev.date_start)
                      ? newEndDate
                      : prev.date_start,
                }));
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              className="w-full bg-transparent text-white outline-none"
            />
          </div>
        </div>

        {/* Time Pickers */}
        <div className="flex gap-4 mt-4">
          {/* Start Time */}
          <div className="flex-1 relative">
            <div
              className="cursor-pointer bg-slate-800/50 border border-cyan-500/30 p-2 rounded-lg hover:border-cyan-400 transition-all"
              onClick={() => handleContainerClick(timeStartRef)}
            >
              <label className="block mb-1 text-cyan-400 text-xs">
                Start Time
              </label>
              <input
                type="time"
                ref={timeStartRef}
                name="time_start"
                value={editableEvent.time_start || ""}
                onChange={handleEditChange}
                className="w-full bg-transparent text-sm text-white outline-none"
              />
            </div>
            {editableEvent.time_start && (
              <button
                className="absolute top-2 right-2 bg-red-500/50 text-white text-xs px-2 py-1 rounded hover:bg-red-600 transition-all"
                onClick={() =>
                  setEditableEvent((prev) => ({ ...prev, time_start: "" }))
                }
              >
                Clear
              </button>
            )}
          </div>

          {/* End Time */}
          <div className="flex-1 relative">
            <div
              className="cursor-pointer bg-slate-800/50 border border-cyan-500/30 p-2 rounded-lg hover:border-cyan-400 transition-all"
              onClick={() => handleContainerClick(timeEndRef)}
            >
              <label className="block mb-1 text-cyan-400 text-xs">
                End Time
              </label>
              <input
                type="time"
                ref={timeEndRef}
                name="time_end"
                value={editableEvent.time_end || ""}
                onChange={handleEditChange}
                className="w-full bg-transparent text-sm text-white outline-none"
              />
            </div>
            {editableEvent.time_end && (
              <button
                className="absolute top-2 right-2 bg-red-500/50 text-white text-xs px-2 py-1 rounded hover:bg-red-600 transition-all"
                onClick={() =>
                  setEditableEvent((prev) => ({ ...prev, time_end: "" }))
                }
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          {/^https?:\/\/[\w-]+(\.[\w-]+)+[/#?]?.*$/.test(
            selectedEvent.location
          ) && (
            <a
              href={selectedEvent.location}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-lg hover:bg-cyan-500 hover:text-white border border-cyan-500 text-cyan-500 transition-all duration-300 text-center block"
            >
              <div className="flex text-sm items-center justify-center gap-2">
                <ExternalLink size={17} />
                <p>Open Link</p>
              </div>
            </a>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded-lg hover:bg-cyan-500 hover:text-white border border-cyan-500 text-cyan-500 transition-all duration-300"
            >
              保存
              <span className="block text-xs">SAVE</span>
            </button>
            <button
              onClick={handleDelete}
              className="px-6 py-2 rounded-lg hover:bg-red-500 hover:text-white border border-red-500 text-red-400 transition-all duration-300"
            >
              削除
              <span className="block text-xs">DELETE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectedLocalEventModal;
