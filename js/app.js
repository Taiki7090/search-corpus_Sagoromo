import { DataLoader } from "./services/data-loader.js";
import { UIInitializer } from "./controllers/ui-initializer.js";
import { EventManager } from "./controllers/event-manager.js";
import { WorkerManager } from "./services/worker-manager.js";
import * as appState from "./store/app-state.js";

export class App {
  constructor() {
    this.dataLoader = new DataLoader();
    this.uiInitializer = new UIInitializer();
    this.eventManager = new EventManager();
    this.workerManager = new WorkerManager();
  }

  async initialize() {
    try {
      await this.uiInitializer.setupInitialUI();
      await this.dataLoader.loadInitialData();
      await this.workerManager.initialize();
      this.eventManager.attachEventListeners();
      await this.setupInitialDataSource();
    } catch (error) {
      console.error("[App] Initialization failed:", error);
      throw error;
    }
  }

  async setupInitialDataSource() {
    if (appState.getIsDataLoaded() && this.workerManager.isReady()) {
      const { switchDataSource } = await import("./services/data-service.js");
      const success = switchDataSource("default");

      if (!success) {
        console.warn("[App] Initial data source setup failed");
      }
    }
  }
}
