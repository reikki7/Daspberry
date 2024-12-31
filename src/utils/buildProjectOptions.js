// Convert your projects array to react-select friendly options:
export const buildProjectOptions = (projects) =>
  projects.map((proj) => ({
    value: proj,
    label: proj,
  }));
