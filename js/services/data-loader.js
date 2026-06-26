import * as appState from "../store/app-state.js";
import { loadDemoDataFromFile } from "./data-service.js";
import { cleanupMetadata } from "../processors/data-processor.js";
import { showLoading } from "../search/search-ui-loader.js";

export class DataLoader {
  async loadInitialData() {
    const DEMO_DATA_PATH = "resources/data/demo-data.txt";

    try {
      showLoading(true, "データ読み込み中...", "search");

      const result = await loadDemoDataFromFile(DEMO_DATA_PATH);

      if (!result?.success) {
        throw new Error(result?.error || "failed to load demo data");
      }

      this.storeData(result);
      cleanupMetadata(appState.getDefaultCorpusData());

      appState.setIsDataLoaded(true);
    } finally {
      showLoading(false, "", "search");
    }
  }

  storeData({ corpusData, indexData, statsData }) {
    appState.storeDefaultData(corpusData, indexData, statsData);
  }
}
