export class EventManager {
  constructor() {
    this.listeners = new Map();
  }

  attachEventListeners() {
    this.attachSearchListeners();
    this.attachClearListeners();
    this.attachImportListener();
    this.attachEnterKeyListener();
    this.attachExportListeners();
  }

  attachSearchListeners() {
    this.addListener("unit-search-button", "click", async () => {
      const { performUnitSearch } = await import(
        "../services/search-service.js"
      );
      performUnitSearch();
    });

    this.addListener("string-search-button", "click", async () => {
      const { performStringSearch } = await import(
        "../services/search-service.js"
      );
      performStringSearch();
    });
  }

  attachClearListeners() {
    this.addListener("clear-search-conditions", "click", async () => {
      const { clearAllConditions } = await import(
        "../search/search-conditions-common.js"
      );
      clearAllConditions();
    });

    this.addListener("string-clear-conditions", "click", async () => {
      const { clearStringConditions } = await import(
        "../search/search-conditions-common.js"
      );
      clearStringConditions();
    });
  }

  attachImportListener() {
    this.addListener("import-search-conditions", "click", async () => {
      const { showSearchConditionInputModal } = await import(
        "../search/search-condition-parser.js"
      );
      showSearchConditionInputModal();
    });
  }

  attachEnterKeyListener() {
    this.addListener("search-query", "keypress", async (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const { performStringSearch } = await import(
          "../services/search-service.js"
        );
        performStringSearch();
      }
    });
  }

  attachExportListeners() {
    this.addListener("unit-export-csv-button", "click", async () => {
      const { exportSearchResultsToCsv } = await import(
        "../ui/ui-csv-export.js"
      );
      exportSearchResultsToCsv("unit");
    });

    this.addListener("string-export-csv-button", "click", async () => {
      const { exportSearchResultsToCsv } = await import(
        "../ui/ui-csv-export.js"
      );
      exportSearchResultsToCsv("string");
    });
  }

  addListener(elementId, eventType, handler) {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener(eventType, handler);
      this.listeners.set(`${elementId}-${eventType}`, { element, handler });
    } else {
      console.warn(`[EventManager] Element not found: ${elementId}`);
    }
  }

  removeAllListeners() {
    this.listeners.forEach(({ element, handler }, key) => {
      const [, eventType] = key.split("-");
      element.removeEventListener(eventType, handler);
    });
    this.listeners.clear();
  }
}
