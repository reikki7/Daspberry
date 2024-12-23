import { CalendarIcon } from "lucide-react";
import { ScaleLoader } from "react-spinners";
import { formatDistanceToNow } from "date-fns";

const AsanaTaskList = ({
  tasks,
  handleTaskClick,
  loading,
  replaceProfileLinks,
}) => {
  return (
    <div className="flex w-full flex-col gap-3">
      {tasks?.length > 0 && !loading ? (
        tasks?.map((task) => (
          <button
            key={task?.gid}
            className="bg-gradient-to-br border hover:backdrop-blur-md bg-gray-950/30 backdrop-blur-lg text-left p-4 rounded-lg hover:bg-[#c08feb]/20 shadow-lg hover:shadow-xl transition-all border-none outline-none"
            onClick={() => handleTaskClick(task)}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-white line-clamp-2 truncate">
                {task?.name}
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center text-xs gap-2">
                  {task?.followers?.map((follower) => (
                    <div
                      key={follower?.gid}
                      className="flex items-center gap-1 border border-white border-opacity-25 bg-blue-950/30 text-white px-3 py-1 rounded-full"
                    >
                      <p>{follower?.name}</p>
                    </div>
                  ))}
                </div>
                {(() => {
                  if (!task.due_on) return null;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  const dueDate = new Date(task.due_on);
                  dueDate.setHours(0, 0, 0, 0);

                  return dueDate < today ? (
                    <div className="bg-red-500/70 -ml-2 px-2 py-1 rounded-full text-xs flex items-center">
                      Overdue
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
            <div className="text-[13px] text-white/70 flex items-center mb-3">
              <CalendarIcon className="w-4 h-4 mr-2 -mt-0.5 text-white/50" />
              {task.due_on ? (
                <>
                  {new Date(task.due_on).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                  {" — ("}
                  {formatDistanceToNow(new Date(task.due_on), {
                    addSuffix: true,
                  })}
                  {")"}
                </>
              ) : (
                "No due date"
              )}
            </div>
            <div className="text-sm text-white/70 mt-2 line-clamp-3 whitespace-pre-wrap">
              {replaceProfileLinks(task.notes)}
            </div>
          </button>
        ))
      ) : (
        <div
          data-tauri-drag-region
          className="flex items-center justify-center"
        >
          <div className="mt-20">
            <ScaleLoader color="#8dccff" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AsanaTaskList;
