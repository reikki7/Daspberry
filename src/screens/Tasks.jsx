import React, { useState, lazy, Suspense } from "react";
import { ScaleLoader } from "react-spinners";

const LocalTasks = lazy(() => import("../components/local-tasks/LocalTasks"));
const AsanaTasks = lazy(() => import("../components/asana-tasks/AsanaTasks"));

const Tasks = () => {
  const [isTaskAvailable, setIsTaskAvailable] = useState(false);
  return (
    <div className="flex flex-col gap-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center mt-20">
            <ScaleLoader color="#8dccff" />
          </div>
        }
      >
        <LocalTasks setIsTaskAvailable={setIsTaskAvailable} />
        <AsanaTasks setIsTaskAvailable={setIsTaskAvailable} />

        {!isTaskAvailable && (
          <div className="text-center text-white text-lg font-light">
            No tasks available
          </div>
        )}
      </Suspense>
    </div>
  );
};

export default Tasks;
