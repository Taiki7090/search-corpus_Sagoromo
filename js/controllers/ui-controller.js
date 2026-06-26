import {
  getActiveDataSourceType,
  getCorpusData,
  getStatsData,
  getUnitTotalHits,
  getUnitSearchResultIds,
  getUnitCurrentPage,
  getUnitResultsPerPage,
  getStringTotalHits,
  getStringSearchResultObjects,
  getStringCurrentPage,
  getStringResultsPerPage,
  setUnitResultsPerPage,
  setStringResultsPerPage,
} from "../store/app-state.js";
import { createPagination } from "../ui/ui-pagination.js";
import {
  columnOrderInternalKeys,
  columnDisplayNames,
  columnNameToIdMap,
  uploadHiddenInternalKeys,
} from "../ui/ui-constants.js";
import {
  setupDisplayColumnListeners,
  setupResultsPerPageListeners,
  saveCurrentColumnState,
  restoreColumnState,
} from "../ui/ui-settings.js";
import {
  updateUnitSearchStats,
  updateStringSearchStats,
} from "../ui/ui-stats.js";
import {
  displayPage,
  displayStringPage,
  updateTableHeader,
  updateStringTableHeader,
  updateColumnVisibility,
  updateStringColumnVisibility,
} from "../ui/ui-table.js";
import {
  getDisplayColumns,
  getStringDisplayColumns,
} from "../ui/ui-column-manager.js";
import { setupCopyButtonAndObserver } from "../ui/ui-utils.js";
import { fieldsForModalTable, setupModalListeners } from "../ui/ui-modal.js";
import { initializeTooltip } from "../ui/ui-tooltip.js";
import {
  rebuildFilterCheckboxesFromCorpus,
  setupVolumeFilterListeners,
  saveCurrentVolumeFilterState,
  restoreVolumeFilterState,
  setupManuscriptFilterListeners,
  restoreManuscriptFilterState,
} from "../ui/ui-filters.js";
import { calculateFilteredStats } from "../utils/stats-utils.js";

export function updateCurrentDataSourceDisplay(dataSourceType) {
  const displayNameElement = document.getElementById(
    "current-data-source-name"
  );
  if (!displayNameElement) {
    console.error(
      "Element #current-data-source-name not found in updateCurrentDataSourceDisplay."
    );
    return;
  }

  let displayName = "";
  let className = "";

  if (dataSourceType === "upload") {
    displayName = "ユーザーデータ";
    className = "upload";
  } else {
    displayName = "デモデータ";
    className = "default";
  }

  displayNameElement.textContent = displayName;
  displayNameElement.classList.remove("default", "upload");
  if (className) {
    displayNameElement.classList.add(className);
  }
}

export function saveCurrentStates(_dataSourceType) {
  saveCurrentColumnState("unit");
  saveCurrentColumnState("string");
  saveCurrentVolumeFilterState("unit");
  saveCurrentVolumeFilterState("string");
}

export function updateDataSourceUI(type) {
  const isUploadOrDemo = type === "upload" || type === "default";
  const currentDisplayNamesToUse = columnDisplayNames.upload;
  if (!currentDisplayNamesToUse) {
    console.error(
      "[UI:updateDataSourceUI] CRITICAL: currentDisplayNamesToUse is undefined or null! Aborting UI update for columns."
    );
    return;
  }

  const keysToHide = isUploadOrDemo ? uploadHiddenInternalKeys : [];

  columnOrderInternalKeys.forEach((internalKey) => {
    const columnId = columnNameToIdMap[internalKey];
    if (!columnId) {
      console.warn(
        `[UI:updateDataSourceUI] No ID mapping found for internal key: ${internalKey}`
      );
      return;
    }

    const unitCheckbox = document.getElementById(`col-${columnId}`);
    const unitLabel = document.querySelector(`label[for="col-${columnId}"]`);
    const unitCheckboxGroup = unitCheckbox
      ? unitCheckbox.closest(".checkbox-group")
      : null;
    if (unitCheckbox && unitLabel && unitCheckboxGroup) {
      unitLabel.textContent =
        currentDisplayNamesToUse[internalKey] || internalKey;
      if (keysToHide.includes(internalKey)) {
        unitCheckboxGroup.style.display = "none";
        unitCheckbox.checked = false;
        unitCheckbox.disabled = true;
      } else {
        unitCheckboxGroup.style.display = "";
        unitCheckbox.disabled = internalKey === "キー";
      }

      const stringCheckbox = document.getElementById(`string-col-${columnId}`);
      const stringLabel = document.querySelector(
        `label[for="string-col-${columnId}"]`
      );
      const stringCheckboxGroup = stringCheckbox
        ? stringCheckbox.closest(".checkbox-group")
        : null;
      if (stringCheckbox && stringLabel && stringCheckboxGroup) {
        stringLabel.textContent =
          currentDisplayNamesToUse[internalKey] || internalKey;
        if (keysToHide.includes(internalKey)) {
          stringCheckboxGroup.style.display = "none";
          stringCheckbox.checked = false;
          stringCheckbox.disabled = true;
        } else {
          stringCheckboxGroup.style.display = "";
          stringCheckbox.disabled = internalKey === "キー";
        }
      }
    }
  });

  restoreColumnState("unit");
  restoreColumnState("string");
  rebuildFilterCheckboxesFromCorpus(getCorpusData());
  restoreVolumeFilterState("unit");
  restoreVolumeFilterState("string");
  restoreManuscriptFilterState("unit");
  restoreManuscriptFilterState("string");

  const defaultVolumeFilterUnit = document.getElementById("default-volume-filter");
  const defaultVolumeFilterString = document.getElementById(
    "string-default-volume-filter"
  );
  const uploadVolumeFilterUnit = document.getElementById("upload-volume-filter");
  const uploadVolumeFilterString = document.getElementById(
    "string-upload-volume-filter"
  );

  if (type === "default" || type === "upload") {
    if (defaultVolumeFilterUnit) defaultVolumeFilterUnit.style.display = "block";
    if (defaultVolumeFilterString)
      defaultVolumeFilterString.style.display = "block";
    if (uploadVolumeFilterUnit) uploadVolumeFilterUnit.style.display = "none";
    if (uploadVolumeFilterString) uploadVolumeFilterString.style.display = "none";
  }

  if (typeof updateColumnVisibility === "function") {
    updateColumnVisibility();
  } else {
    console.error("updateColumnVisibility function not found!");
  }
  if (typeof updateStringColumnVisibility === "function") {
    updateStringColumnVisibility();
  } else {
    console.error("updateStringColumnVisibility function not found!");
  }

  const modalTableHead = document.querySelector(
    "#modal-metadata-table thead tr"
  );
  if (
    modalTableHead &&
    fieldsForModalTable &&
    modalTableHead.children.length >= fieldsForModalTable.length
  ) {
    fieldsForModalTable.forEach((internalKey, index) => {
      if (modalTableHead.children[index]) {
        let displayNameForKey =
          columnDisplayNames.upload[internalKey] || internalKey;
        modalTableHead.children[index].textContent = displayNameForKey;
      }
    });
  }
}

export function displayResults() {
  const totalHits = getUnitTotalHits() || 0;
  const resultIds = getUnitSearchResultIds() || [];
  const currentPageNum = getUnitCurrentPage() || 1;
  const resultsPerPage = getUnitResultsPerPage() || 20;
  const resultsContainer = document.getElementById("unit-results");
  const unitResultStats = document.getElementById("unit-result-stats");
  const paginationContainer = document.getElementById("pagination");
  const tableResults = document.getElementById("table-results");
  const tableBody = document.getElementById("results-table-body");

  if (
    !resultsContainer ||
    !unitResultStats ||
    !paginationContainer ||
    !tableResults ||
    !tableBody
  ) {
    console.error("[displayResults] Required UI elements not found.");
    return;
  }
  resultsContainer.style.display = "block";

  const totalPages =
    resultsPerPage > 0 && totalHits > 0
      ? Math.ceil(totalHits / resultsPerPage)
      : totalHits > 0
      ? 1
      : 0;

  if (paginationContainer) {
    paginationContainer.innerHTML = "";
    paginationContainer.className = "pagination-container";
    if (totalPages > 0) {
      paginationContainer.style.display = "flex";
      if (typeof createPagination === "function") {
        createPagination(
          "unit",
          totalHits,
          totalPages,
          currentPageNum,
          resultsPerPage,
          displayPage
        );
      } else {
        console.error("createPagination function not found!");
        paginationContainer.innerHTML = "<span>pagination error</span>";
      }
    } else {
      paginationContainer.style.display = "none";
    }
  } else {
    console.error("Pagination container #pagination not found!");
  }

  if (totalHits === 0) {
    tableResults.style.display = "none";
    tableBody.innerHTML = "";
    const currentStatsData = getStatsData();
    const filteredStats =
      typeof calculateFilteredStats === "function"
        ? calculateFilteredStats(currentStatsData)
        : {};
    if (typeof updateUnitSearchStats === "function")
      updateUnitSearchStats(0, filteredStats, 0, 1, resultsPerPage);
    return;
  }

  tableResults.style.display = "block";
  let internalKeysForTable = [];
  try {
    const internalKeysFromCheckboxes = getDisplayColumns();
    internalKeysForTable =
      typeof updateTableHeader === "function"
        ? updateTableHeader(internalKeysFromCheckboxes)
        : internalKeysFromCheckboxes;
    if (
      !Array.isArray(internalKeysForTable) ||
      internalKeysForTable.length === 0
    ) {
      throw new Error("Invalid or empty internal keys for table header");
    }
  } catch (e) {
    console.error("Error getting/updating columns in displayResults:", e);
    internalKeysForTable =
      typeof defaultUnitDisplayColumns !== "undefined"
        ? defaultUnitDisplayColumns.filter((key) =>
            columnOrderInternalKeys.includes(key)
          )
        : ["ファイル名", "前文脈", "キー", "後文脈", "巻名"];
    if (typeof updateTableHeader === "function")
      updateTableHeader(internalKeysForTable);
    else console.error("updateTableHeader function not found for fallback!");
  }

  const currentStatsData = getStatsData();
  const filteredStats =
    typeof calculateFilteredStats === "function"
      ? calculateFilteredStats(currentStatsData)
      : {};
  const uniqueFiles = new Set();
  if (getCorpusData()?.tokens)
    resultIds.forEach((item) => {
      const tokenId = item.tokenId;
      if (getCorpusData().tokens[tokenId]?.ファイル名)
        uniqueFiles.add(getCorpusData().tokens[tokenId].ファイル名);
    });
  if (typeof updateUnitSearchStats === "function")
    updateUnitSearchStats(
      totalHits,
      filteredStats,
      uniqueFiles.size,
      currentPageNum,
      resultsPerPage
    );

  if (typeof displayPage === "function") {
    displayPage(currentPageNum, resultsPerPage);
  } else {
    console.error("displayPage function not found!");
    if (tableBody)
      tableBody.innerHTML = '<tr><td colspan="100%">表示機能エラー</td></tr>';
  }
}

export function displayStringResults() {
  const results = getStringSearchResultObjects() || [];
  const totalHits = getStringTotalHits() || 0;
  if (totalHits !== results.length) {
    console.warn(
      `[DEBUG displayStringResults] Mismatch: global totalHits (${totalHits}) vs array length (${results.length})`
    );
  }

  const resultsContainer = document.getElementById("string-results");
  const stringResultStats = document.getElementById("string-result-stats");
  const paginationContainer = document.getElementById("string-pagination");
  const tableResults = document.getElementById("string-table-results");
  const tableBody = document.getElementById("string-results-table-body");

  if (
    !resultsContainer ||
    !stringResultStats ||
    !paginationContainer ||
    !tableResults ||
    !tableBody
  ) {
    console.error("[displayStringResults] Required UI elements not found.");
    return;
  }
  resultsContainer.style.display = "block";

  if (totalHits === 0) {
    if (tableResults) tableResults.style.display = "none";
    if (paginationContainer) {
      paginationContainer.innerHTML = "";
      paginationContainer.style.display = "none";
    }
    if (tableBody) tableBody.innerHTML = "";
    const currentStatsData = getStatsData();
    const filteredStats =
      typeof calculateFilteredStats === "function"
        ? calculateFilteredStats(currentStatsData)
        : {};
    const currentPerPage = getStringResultsPerPage() || 20;
    if (typeof updateStringSearchStats === "function") {
      updateStringSearchStats(0, filteredStats, 0, 1, currentPerPage);
    } else {
      console.warn("updateStringSearchStats function not found");
      if (stringResultStats) stringResultStats.innerHTML = "検索結果 0件";
    }
    return;
  }

  if (tableResults) tableResults.style.display = "block";

  let internalKeysForTable = [];
  const currentPageNum = getStringCurrentPage() || 1;
  const currentPerPage = getStringResultsPerPage() || 20;
  try {
    const internalKeysFromCheckboxes = getStringDisplayColumns();
    internalKeysForTable =
      typeof updateStringTableHeader === "function"
        ? updateStringTableHeader(internalKeysFromCheckboxes)
        : internalKeysFromCheckboxes;
    if (
      !Array.isArray(internalKeysForTable) ||
      internalKeysForTable.length === 0
    ) {
      throw new Error("Header update returned invalid keys");
    }
  } catch (e) {
    console.error("[DEBUG displayStringResults] Error updating header:", e);
    internalKeysForTable =
      typeof defaultStringDisplayColumns !== "undefined"
        ? defaultStringDisplayColumns.filter((key) =>
            columnOrderInternalKeys.includes(key)
          )
        : ["ファイル名", "前文脈", "キー", "後文脈"];
    if (typeof updateStringTableHeader === "function")
      updateStringTableHeader(internalKeysForTable);
    else
      console.error("updateStringTableHeader function not found for fallback!");
  }

  const currentStatsData = getStatsData();
  const filteredStats =
    typeof calculateFilteredStats === "function"
      ? calculateFilteredStats(currentStatsData)
      : {};
  const uniqueFiles = new Set();
  if (Array.isArray(results)) {
    results.forEach((result) => {
      if (result?.token?.ファイル名) uniqueFiles.add(result.token.ファイル名);
    });
  }
  if (typeof updateStringSearchStats === "function") {
    updateStringSearchStats(
      totalHits,
      filteredStats,
      uniqueFiles.size,
      currentPageNum,
      currentPerPage
    );
  } else {
    console.warn("updateStringSearchStats function not found");
    if (stringResultStats)
      stringResultStats.innerHTML = `検索結果 ${totalHits}件`;
  }

  const totalPages =
    totalHits > 0 ? Math.ceil(totalHits / currentPerPage) || 1 : 0;
  if (typeof createPagination === "function" && paginationContainer) {
    paginationContainer.innerHTML = "";
    paginationContainer.className = "pagination-container";
    createPagination(
      "string",
      totalHits,
      totalPages,
      currentPageNum,
      currentPerPage,
      displayStringPage
    );
    if (paginationContainer && totalHits > 0) {
      paginationContainer.style.display = "flex";
    } else if (paginationContainer) {
      paginationContainer.style.display = "none";
    }
  } else {
    console.error(
      "createPagination function or pagination container #string-pagination not found!"
    );
    if (paginationContainer)
      paginationContainer.innerHTML = "<span>pagination error</span>";
  }

  if (typeof displayStringPage === "function") {
    displayStringPage(currentPageNum, currentPerPage);
  } else {
    console.error("displayStringPage function not found!");
    if (tableBody)
      tableBody.innerHTML =
        '<tr><td colspan="100%">displayStringPage error</td></tr>';
  }
}

function toggleSearchConditions(containerElementOrSelector) {
  let container = null;
  if (typeof containerElementOrSelector === "string") {
    container = document.querySelector(containerElementOrSelector);
  } else if (containerElementOrSelector instanceof HTMLElement) {
    container = containerElementOrSelector;
  }
  if (!container?.classList.contains("search-conditions-container")) {
    container = container?.closest(".search-conditions-container");
  }
  if (!container) {
    console.warn("toggleSearchConditions: Container not found.");
    return;
  }
  const isCurrentlyOpen = container.classList.contains("open");
  container.classList.toggle("open", !isCurrentlyOpen);
  container.classList.toggle("closed", isCurrentlyOpen);
  const button = container.querySelector(".toggle-conditions-button");
  if (button) {
    button.textContent = isCurrentlyOpen ? "▼" : "▲";
  }
}

function setupToggleSearchConditionsListeners() {
  document.body.addEventListener("click", function (event) {
    const titleElement = event.target.closest(".search-conditions-title");
    const buttonElement = event.target.closest(".toggle-conditions-button");

    if (titleElement) {
      const container = titleElement.parentNode;
      if (
        container &&
        container.classList.contains("search-conditions-container")
      ) {
        toggleSearchConditions(container);
      }
    } else if (buttonElement) {
      const container = buttonElement.parentNode;
      if (
        container &&
        container.classList.contains("search-conditions-container")
      ) {
        toggleSearchConditions(container);
      }
    }
  });
}

function initializeStringSearchOptions() {
  try {
    const optionsContainer = document.getElementById("string-search-options");
    if (!optionsContainer) {
      console.warn("[ui.js] #string-search-options container not found.");
      return;
    }
    const toggleButton = optionsContainer.querySelector(
      ".toggle-conditions-button"
    );
    const titleElement = optionsContainer.querySelector(
      ".search-conditions-title"
    );
    if (toggleButton) {
      toggleButton.textContent = optionsContainer.classList.contains("closed")
        ? "▼"
        : "▲";
    } else {
      console.warn("[ui.js] Toggle button not found.");
    }
    if (!titleElement) {
      console.warn("[ui.js] Title element not found.");
    }
  } catch (error) {
    console.error("[ui.js] Error initializing string search options:", error);
  }
}

function setupTabSwitching() {
  try {
    const tabs = document.querySelectorAll(".tab");
    if (tabs.length === 0) return;

    tabs.forEach((tab) => {
      tab.addEventListener("click", function () {
        const clickedTabId = this.getAttribute("data-tab");

        document
          .querySelectorAll(".tab")
          .forEach((t) => t.classList.remove("active"));
        document
          .querySelectorAll(".tab-content")
          .forEach((c) => c.classList.remove("active"));

        this.classList.add("active");

        const contentElement = document.getElementById(clickedTabId);
        if (contentElement) {
          contentElement.classList.add("active");
        } else {
          console.error(
            `[UI:setupTabSwitching] Content element with ID '${clickedTabId}' NOT FOUND in DOM!`
          );
        }
      });
    });
  } catch (error) {
    console.error("[UI:setupTabSwitching] Error:", error);
  }
}

function initializeCoreUI() {
  setUnitResultsPerPage(
    parseInt(document.getElementById("results-per-page")?.value, 10) || 20
  );
  setStringResultsPerPage(
    parseInt(document.getElementById("string-results-per-page")?.value, 10) ||
      20
  );

  if (typeof setupModalListeners === "function") setupModalListeners();
  initializeStringSearchOptions();
  setupTabSwitching();
  if (typeof setupDisplayColumnListeners === "function")
    setupDisplayColumnListeners();
  if (typeof setupResultsPerPageListeners === "function")
    setupResultsPerPageListeners();
  setupCopyButtonAndObserver();
  if (typeof initializeTooltip === "function") initializeTooltip();
  if (typeof setupVolumeFilterListeners === "function")
    setupVolumeFilterListeners();
  if (typeof setupManuscriptFilterListeners === "function")
    setupManuscriptFilterListeners();
  setupToggleSearchConditionsListeners();

  const initialDataSourceType = getActiveDataSourceType() || "default";
  updateCurrentDataSourceDisplay(initialDataSourceType);
}

document.addEventListener("DOMContentLoaded", initializeCoreUI);
