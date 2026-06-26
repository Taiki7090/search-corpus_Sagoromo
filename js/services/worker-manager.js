import {
  initializeSearchWorker,
  updateSearchButtonState,
} from "./search-service.js";

export class WorkerManager {
  constructor() {
    this.worker = null;
    this.ready = false;
  }

  async initialize() {
    try {
      await initializeSearchWorker();
      this.ready = true;
    } catch (error) {
      console.error("[WorkerManager] Initialization failed:", error);
      updateSearchButtonState();
      throw new Error("failed to initialize search engine");
    }
  }

  isReady() {
    return this.ready;
  }
}
