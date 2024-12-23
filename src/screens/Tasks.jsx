import React, { useState, lazy, Suspense } from "react";

const LocalTasks = lazy(() => import("../components/tasks/LocalTasks"));
const AsanaTasks = lazy(() => import("../components/tasks/AsanaTasks"));

const Tasks = () => {
  const [isTaskAvailable, setIsTaskAvailable] = useState(false);
  return (
    <div className="flex flex-col gap-6">
      <Suspense>
        <LocalTasks setIsTaskAvailable={setIsTaskAvailable} />
        <AsanaTasks setIsTaskAvailable={setIsTaskAvailable} />
      </Suspense>
      {!isTaskAvailable && (
        <div className="text-center text-white text-lg font-light">
          No tasks available
        </div>
      )}
    </div>
  );
};

export default Tasks;
