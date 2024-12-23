const NewLocalEventModal = ({
  newEvent,
  setNewEvent,
  setNewEventModalOpen,
  startDateRef,
  endDateRef,
  timeStartRef,
  timeEndRef,
  handleContainerClick,
  handleAddEvent,
  clearTime,
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop with cyber effect */}
      <div
        data-tauri-drag-region
        className="absolute rounded-3xl inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <div
        data-tauri-drag-region
        className="relative bg-slate-900/20 backdrop-blur-sm rounded-xl p-8 w-full max-w-md border border-cyan-500/30 shadow-2xl shadow-cyan-500/20"
      >
        <button
          onClick={() => {
            setNewEvent({
              title: "",
              description: "",
              start_date: "",
              end_date: "",
              location: "",
            });
            setNewEventModalOpen(false);
          }}
          className="px-3 py-1 absolute top-2 right-2 rounded-lg bg-slate-800/80 text-cyan-400 border border-cyan-500/30 hover:bg-slate-700/80 hover:border-cyan-400 transition-all duration-300"
        >
          <span className="block text-md">x</span>
        </button>
        {/* Decorative corner elements */}
        <div className="absolute top-0 left-0 w-16 h-16 border-l border-t border-cyan-400 rounded-tl-xl"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-r border-b border-cyan-400 rounded-br-xl"></div>

        {/* Header */}
        <h2 className="text-2xl font-bold mb-6 text-white text-center">
          新しいイベント
          <span className="block text-sm text-cyan-400 mt-1">NEW EVENT</span>
        </h2>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Event Title"
              value={newEvent.title}
              onChange={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setNewEvent((prev) => ({ ...prev, title: e.target.value }));
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              className="w-full bg-slate-800/50 text-cyan-50 p-3 rounded-lg border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-cyan-200/30 transition-all outline-none"
            />
          </div>

          <div className="relative">
            <textarea
              placeholder="Event Description"
              value={newEvent.description}
              onChange={(e) => {
                e.preventDefault();
                e.stopPropagation;
                setNewEvent((prev) => ({
                  ...prev,
                  description: e.target.value,
                }));
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              className="w-full bg-slate-800/50 h-64 text-cyan-50 p-3 rounded-lg border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-cyan-200/30 transition-all outline-none resize-none"
            />
          </div>

          <div className="flex gap-4">
            <div
              className="flex-1 cursor-pointer bg-slate-800/50 border border-cyan-500/30 p-2 rounded-lg hover:border-cyan-400 transition-all"
              onClick={() => handleContainerClick(startDateRef)}
            >
              <label className="block mb-1 text-cyan-400 text-xs">
                Start Date
              </label>
              <input
                type="date"
                ref={startDateRef}
                value={newEvent.date_start}
                onChange={(e) => {
                  const newStartDate = e.target.value;
                  setNewEvent((prev) => ({
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
                className="w-full bg-transparent text-sm text-white outline-none"
              />
            </div>
            <div
              className="flex-1 cursor-pointer bg-slate-800/50 border border-cyan-500/30 p-2 rounded-lg hover:border-cyan-400 transition-all"
              onClick={() => handleContainerClick(endDateRef)}
            >
              <label className="block mb-1 text-cyan-400 text-xs">
                End Date
              </label>
              <input
                type="date"
                ref={endDateRef}
                value={newEvent.date_end}
                onChange={(e) => {
                  const newEndDate = e.target.value;
                  setNewEvent((prev) => ({
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
                className="w-full bg-transparent text-sm text-white outline-none"
              />
            </div>
          </div>

          <div className="flex gap-4">
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
                  value={newEvent.time_start}
                  onChange={(e) =>
                    setNewEvent((prev) => ({
                      ...prev,
                      time_start: e.target.value,
                    }))
                  }
                  className="w-full bg-transparent text-sm text-white outline-none"
                />
              </div>
              {newEvent.time_start && (
                <button
                  className="absolute top-2 right-2 bg-red-500/50 text-white text-xs px-2 py-1 rounded hover:bg-red-600 transition-all"
                  onClick={() => clearTime("time_start")}
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
                  value={newEvent.time_end}
                  onChange={(e) =>
                    setNewEvent((prev) => ({
                      ...prev,
                      time_end: e.target.value,
                    }))
                  }
                  className="w-full bg-transparent text-sm text-white outline-none"
                />
              </div>
              {newEvent.time_end && (
                <button
                  className="absolute top-2 right-2 bg-red-500/50 text-white text-xs px-2 py-1 rounded hover:bg-red-600 transition-all"
                  onClick={() => clearTime("time_end")}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Event Location"
              value={newEvent.location}
              onChange={(e) => {
                e.preventDefault();
                e.stopPropagation;
                setNewEvent({ ...newEvent, location: e.target.value });
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              className="w-full bg-slate-800/50 text-cyan-50 p-3 rounded-lg border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-cyan-200/30 transition-all outline-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleAddEvent}
            className="px-6 py-2 text-sm rounded-lg hover:bg-cyan-500 hover:text-white border border-cyan-500 text-cyan-500 transition-all duration-300"
          >
            保存
            <span className="block text-xs">SAVE</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewLocalEventModal;
