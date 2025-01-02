import { create } from "zustand";

const useEventsStore = create((set) => ({
  stateEvents: [],
  isFetching: false,
  setStateEvents: (newEvents) => set({ stateEvents: newEvents }),
  setIsFetching: (status) => set({ isFetching: status }),
}));

export default useEventsStore;
