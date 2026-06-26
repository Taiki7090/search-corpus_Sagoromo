import * as appState from "../store/app-state.js";
import {
  updateColumnVisibility,
  updateStringColumnVisibility,
  displayPage,
  displayStringPage,
} from "./ui-table.js";
import { createPagination } from "./ui-pagination.js";
import { updateUnitSearchStats, updateStringSearchStats } from "./ui-stats.js";
import { calculateFilteredStats } from "../utils/stats-utils.js";

export function setupDisplayColumnListeners() {
  try {
    const unitCheckboxes = document.querySelectorAll(
      'input[name="display-column"]'
    );
    unitCheckboxes.forEach((checkbox) => {
      if (checkbox.value === "キー") {
        checkbox.disabled = true;
      } else {
        checkbox.addEventListener("change", () => {
          saveCurrentColumnState("unit");
          updateColumnVisibility();
        });
      }
    });

    const selectAllColsBtn = document.getElementById("select-all-columns");
    if (selectAllColsBtn) {
      selectAllColsBtn.addEventListener("click", () => {
        document
          .querySelectorAll('input[name="display-column"]')
          .forEach((cb) => {
            const parentGroup = cb.closest(".checkbox-group");
            if (
              parentGroup &&
              parentGroup.style.display !== "none" &&
              !cb.disabled
            ) {
              cb.checked = true;
            }
          });
        saveCurrentColumnState("unit");
        updateColumnVisibility();
      });
    } else console.warn("[ui.js] select-all-columns button not found");

    const selectCtxOnlyBtn = document.getElementById("select-context-only");
    if (selectCtxOnlyBtn) {
      selectCtxOnlyBtn.addEventListener("click", () => {
        const contextColsInternalKeys = ["前文脈", "キー", "後文脈"];
        document
          .querySelectorAll('input[name="display-column"]')
          .forEach((cb) => {
            const internalKey = cb.value;
            const parentGroup = cb.closest(".checkbox-group");
            const isVisible =
              parentGroup && parentGroup.style.display !== "none";

            if (isVisible) {
              if (cb.disabled) {
                cb.checked = true;
              } else {
                cb.checked = contextColsInternalKeys.includes(internalKey);
              }
            }
          });
        saveCurrentColumnState("unit");
        updateColumnVisibility();
      });
    }

    const stringCheckboxes = document.querySelectorAll(
      'input[name="string-display-column"]'
    );
    stringCheckboxes.forEach((checkbox) => {
      if (checkbox.value === "キー") {
        checkbox.disabled = true;
      } else {
        checkbox.addEventListener("change", () => {
          saveCurrentColumnState("string");
          updateStringColumnVisibility();
        });
      }
    });

    const stringSelectAllBtn = document.getElementById(
      "string-select-all-columns"
    );
    if (stringSelectAllBtn) {
      stringSelectAllBtn.addEventListener("click", () => {
        document
          .querySelectorAll('input[name="string-display-column"]')
          .forEach((cb) => {
            const parentGroup = cb.closest(".checkbox-group");
            if (
              parentGroup &&
              parentGroup.style.display !== "none" &&
              !cb.disabled
            ) {
              cb.checked = true;
            }
          });
        saveCurrentColumnState("string");
        updateStringColumnVisibility();
      });
    } else console.warn("[ui.js] string-select-all-columns button not found");

    const stringSelectCtxOnlyBtn = document.getElementById(
      "string-select-context-only"
    );
    if (stringSelectCtxOnlyBtn) {
      stringSelectCtxOnlyBtn.addEventListener("click", () => {
        const contextColsInternalKeys = ["前文脈", "キー", "後文脈"];
        document
          .querySelectorAll('input[name="string-display-column"]')
          .forEach((cb) => {
            const internalKey = cb.value;
            const parentGroup = cb.closest(".checkbox-group");
            const isVisible =
              parentGroup && parentGroup.style.display !== "none";

            if (isVisible) {
              if (cb.disabled) {
                cb.checked = true;
              } else {
                cb.checked = contextColsInternalKeys.includes(internalKey);
              }
            }
          });
        saveCurrentColumnState("string");
        updateStringColumnVisibility();
      });
    }
  } catch (error) {
    console.error("[ui.js] Error setting up display column listeners:", error);
  }
}

export function setupResultsPerPageListeners() {
  try {
    const unitResultsPerPageSelect =
      document.getElementById("results-per-page");
    if (unitResultsPerPageSelect) {
      appState.setUnitResultsPerPage(
        parseInt(unitResultsPerPageSelect.value, 10) || 20
      );
      unitResultsPerPageSelect.addEventListener("change", () => {
        const newPerPage = parseInt(unitResultsPerPageSelect.value, 10);
        appState.setUnitResultsPerPage(newPerPage);
        appState.setUnitCurrentPage(1);
        const totalHits = appState.getUnitTotalHits() || 0;
        const resultIds = appState.getUnitSearchResultIds() || [];
        if (totalHits > 0) {
          const totalPages = Math.ceil(totalHits / newPerPage);
          const currentStatsData =
            appState.getActiveDataSourceType() === "upload"
              ? appState.getUploadedStatsData()
              : appState.getStatsData();
          const filteredStats =
            typeof calculateFilteredStats === "function"
              ? calculateFilteredStats(currentStatsData)
              : {};
          const uniqueFiles = new Set();
          const currentCorpusData = appState.getCorpusData();
          if (currentCorpusData?.tokens) {
            resultIds.forEach((id) => {
              const token = currentCorpusData.tokens[id];
              if (token?.ファイル名) uniqueFiles.add(token.ファイル名);
            });
          } else {
            console.warn(
              "[setupResultsPerPageListeners] appState.getCorpusData().tokens not available for unit search."
            );
          }
          if (typeof updateUnitSearchStats === "function")
            updateUnitSearchStats(
              totalHits,
              filteredStats,
              uniqueFiles.size,
              1,
              newPerPage
            );
          if (typeof displayPage === "function") displayPage(1, newPerPage);
          if (typeof createPagination === "function") {
            createPagination(
              "unit",
              totalHits,
              totalPages,
              1,
              newPerPage,
              (page, _perPage) => {
                if (typeof displayPage === "function")
                  displayPage(page, appState.getUnitResultsPerPage() || 20);
              }
            );
          }
        } else {
          const pagination = document.getElementById("pagination");
          if (pagination) {
            pagination.innerHTML = "";
            pagination.style.display = "none";
          }
          const currentStatsData =
            appState.getActiveDataSourceType() === "upload"
              ? appState.getUploadedStatsData()
              : appState.getStatsData();
          const filteredStats =
            typeof calculateFilteredStats === "function"
              ? calculateFilteredStats(currentStatsData)
              : {};
          if (typeof updateUnitSearchStats === "function")
            updateUnitSearchStats(0, filteredStats, 0, 1, newPerPage);
        }
      });
    } else {
      console.warn("results-per-page select not found");
      appState.setUnitResultsPerPage(20);
    }
    const stringResultsPerPageSelect = document.getElementById(
      "string-results-per-page"
    );
    if (stringResultsPerPageSelect) {
      appState.setStringResultsPerPage(
        parseInt(stringResultsPerPageSelect.value, 10) || 20
      );
      stringResultsPerPageSelect.addEventListener("change", () => {
        const newPerPage = parseInt(stringResultsPerPageSelect.value, 10);
        appState.setStringResultsPerPage(newPerPage);
        appState.setStringCurrentPage(1);
        const totalHits = appState.getStringTotalHits() || 0;
        const results = appState.getStringSearchResultObjects() || [];
        if (totalHits > 0) {
          const totalPages = Math.ceil(totalHits / newPerPage);
          const currentStatsData =
            appState.getActiveDataSourceType() === "upload"
              ? appState.getUploadedStatsData()
              : appState.getStatsData();
          const filteredStats =
            typeof calculateFilteredStats === "function"
              ? calculateFilteredStats(currentStatsData)
              : {};
          const uniqueFiles = new Set();
          const currentCorpusDataForString = appState.getCorpusData();
          if (currentCorpusDataForString?.tokens) {
            results.forEach((result) => {
              if (result?.token?.ファイル名)
                uniqueFiles.add(result.token.ファイル名);
            });
          } else {
            console.warn(
              "[setupResultsPerPageListeners] appState.getCorpusData().tokens not available for string search stats."
            );
          }
          if (typeof updateStringSearchStats === "function")
            updateStringSearchStats(
              totalHits,
              filteredStats,
              uniqueFiles.size,
              1,
              newPerPage
            );
          if (typeof displayStringPage === "function")
            displayStringPage(1, newPerPage);
          if (typeof createPagination === "function") {
            createPagination(
              "string",
              totalHits,
              totalPages,
              1,
              newPerPage,
              (page, _perPage) => {
                if (typeof displayStringPage === "function")
                  displayStringPage(
                    page,
                    appState.getStringResultsPerPage() || 20
                  );
              }
            );
          }
        } else {
          const pagination = document.getElementById("string-pagination");
          if (pagination) {
            pagination.innerHTML = "";
            pagination.style.display = "none";
          }
          const currentStatsData =
            appState.getActiveDataSourceType() === "upload"
              ? appState.getUploadedStatsData()
              : appState.getStatsData();
          const filteredStats =
            typeof calculateFilteredStats === "function"
              ? calculateFilteredStats(currentStatsData)
              : {};
          if (typeof updateStringSearchStats === "function")
            updateStringSearchStats(0, filteredStats, 0, 1, newPerPage);
        }
      });
    } else {
      console.warn("string-results-per-page select not found");
      appState.setStringResultsPerPage(20);
    }
  } catch (error) {
    console.error("Error setting up results per page listeners:", error);
  }
}

export function saveCurrentColumnState(searchType) {
  const dataSourceType = appState.getActiveDataSourceType() || "default";
  const checkboxName =
    searchType === "unit" ? "display-column" : "string-display-column";

  document.querySelectorAll(`input[name="${checkboxName}"]`).forEach((cb) => {
    if (!cb.disabled) {
      appState.setColumnState(dataSourceType, searchType, cb.value, cb.checked);
    }
  });
}

export function restoreColumnState(searchType) {
  const dataSourceType = appState.getActiveDataSourceType() || "default";
  const stateObj = appState.getColumnStates()[dataSourceType][searchType];
  const checkboxName =
    searchType === "unit" ? "display-column" : "string-display-column";

  document.querySelectorAll(`input[name="${checkboxName}"]`).forEach((cb) => {
    const internalKey = cb.value;
    const parentGroup = cb.closest(".checkbox-group");
    const isVisible = parentGroup && parentGroup.style.display !== "none";

    if (internalKey === "キー") {
      cb.checked = true;
      cb.disabled = true;
    } else if (isVisible) {
      cb.disabled = false;
      cb.checked =
        stateObj[internalKey] !== undefined ? stateObj[internalKey] : true;
    } else {
      cb.checked = false;
      cb.disabled = true;
    }
  });
}
