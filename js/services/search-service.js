import * as appState from "../store/app-state.js";
import {
  displayResults,
  displayStringResults,
} from "../controllers/ui-controller.js";
import {
  getVolumeFilterSettingsFromDOM,
  getStringVolumeFilterSettingsFromDOM,
} from "../ui/ui-filters.js";
import { performStringSearch as performStringSearchCore } from "../search/search-core.js";
import { filterResultsInMainThread } from "../search/search-filter.js";
import { getShortUnitConditions } from "../search/search-short-unit-conditions.js";
import { processStringSearchResultsInChunks } from "../search/search-string-result-processor.js";
import { clearSearchResults } from "../search/search-conditions-common.js";
import { showLoading } from "../search/search-ui-loader.js";
import { validateSearchConditions } from "../search/search-validator.js";

let searchWorker = null;
let isWorkerReady = false;
let isWorkerSearching = false;

export async function performUnitSearch() {
  const volumeSettings = getVolumeFilterSettingsFromDOM();

  const keyElement = document.querySelector(
    '.search-condition[data-is-key="true"]'
  );
  const typeSelect = keyElement.querySelector(".condition-type");
  const keyType = typeSelect ? typeSelect.value : "";
  let keyValue = "";
  const keyInputElement = keyElement.querySelector(
    ".search-condition-input .condition-value"
  );
  if (keyInputElement) {
    keyValue = keyInputElement.dataset.value || keyInputElement.value;
  }

  const keyShortUnits =
    typeof getShortUnitConditions === "function"
      ? getShortUnitConditions(keyElement)
      : [];

  // Condition for worker
  const keyConditionForWorker = {
    type: keyType,
    value: keyValue,
    shortUnitConditions: keyShortUnits,
  };

  await performUnitSearchCoreModified(
    searchWorker,
    appState.getIsWorkerDataLoaded(),
    isWorkerSearching,
    showLoading,
    clearSearchResults,
    updateSearchButtonState,
    () => volumeSettings,
    displaySearchError,
    keyConditionForWorker
  );
}

export async function performStringSearch() {
  const volumeSettings = getStringVolumeFilterSettingsFromDOM();
  await performStringSearchCore(
    searchWorker,
    appState.getIsWorkerDataLoaded(),
    isWorkerSearching,
    showLoading,
    clearSearchResults,
    updateSearchButtonState,
    () => volumeSettings,
    displaySearchError
  );
}

export function updateSearchButtonState(isSearchingNow) {
  isWorkerSearching = isSearchingNow;
  const unitSearchBtn = document.getElementById("unit-search-button");
  const stringSearchBtn = document.getElementById("string-search-button");
  const enableButtons =
    isWorkerReady && appState.getIsWorkerDataLoaded() && !isWorkerSearching;
  if (unitSearchBtn) unitSearchBtn.disabled = !enableButtons;
  if (stringSearchBtn) stringSearchBtn.disabled = !enableButtons;
}

export function initializeSearchWorker() {
  return new Promise((resolve, reject) => {
    try {
      if (searchWorker) {
        console.warn(
          "[Search.js:initializeSearchWorker] Terminating existing worker..."
        );
        searchWorker.terminate();
        searchWorker = null;
      }
      searchWorker = new Worker("js/search/search-worker.js");
      isWorkerReady = false;
      isWorkerSearching = false;
      updateSearchButtonState(false);

      searchWorker.onmessage = function (event) {
        const { type, success, results, error } = event.data;
        if (type === "workerReady") {
          isWorkerReady = true;
          updateSearchButtonState(isWorkerSearching);
          resolve(searchWorker);
          return;
        }

        if (type === "dataLoaded") {
          appState.setIsWorkerDataLoaded(true);
          updateSearchButtonState(false);
          return;
        }

        if (type === "searchProgress") {
          return;
        }

        if (type === "unitSearchResult" || type === "stringSearchResult") {
          if (typeof showLoading === "function")
            showLoading(false, "", "search");
          updateSearchButtonState(false);
        }

        if (type === "unitSearchResult") {
          if (success && results) {
            if (appState.getCorpusData()) {
              const candidateTokenIds = results.tokenIds || [];
              try {
                const keyElement = document.querySelector(
                  '.search-condition[data-is-key="true"]'
                );
                if (!keyElement) {
                  throw new Error("キー条件要素が見つかりません。");
                }
                const typeSelect = keyElement.querySelector(".condition-type");
                const keyType = typeSelect ? typeSelect.value : "";
                let keyValue = "";
                const keyInputContainer = keyElement.querySelector(
                  ".search-condition-input"
                );
                let keyInputElement = null;
                if (keyInputContainer) {
                  keyInputElement =
                    keyInputContainer.querySelector(".condition-value");
                }
                if (keyInputElement) {
                  keyValue =
                    keyInputElement.dataset.value ||
                    keyInputElement.value ||
                    "";
                }

                const keyShortUnits =
                  typeof getShortUnitConditions === "function"
                    ? getShortUnitConditions(keyElement)
                    : [];
                const keyConditionForMain = {
                  type: keyType,
                  value: keyValue,
                  shortUnitConditions: keyShortUnits,
                };

                const preContextConditionsForMain = Array.from(
                  document.querySelectorAll(
                    "#pre-context-conditions .search-condition"
                  )
                ).map((el) => ({
                  type: el.querySelector(".condition-type")?.value || "",
                  value:
                    el.querySelector(".search-condition-input .condition-value")
                      ?.dataset.value ||
                    el.querySelector(".search-condition-input .condition-value")
                      ?.value ||
                    "",
                  range:
                    el.querySelector(".context-width-select")?.value || "1",
                  unit: el.querySelector(".context-unit-select")?.value || "語",
                  shortUnitConditions:
                    typeof getShortUnitConditions === "function"
                      ? getShortUnitConditions(el)
                      : [],
                }));
                const postContextConditionsForMain = Array.from(
                  document.querySelectorAll(
                    "#post-context-conditions .search-condition"
                  )
                ).map((el) => ({
                  type: el.querySelector(".condition-type")?.value || "",
                  value:
                    el.querySelector(".search-condition-input .condition-value")
                      ?.dataset.value ||
                    el.querySelector(".search-condition-input .condition-value")
                      ?.value ||
                    "",
                  range:
                    el.querySelector(".context-width-select")?.value || "1",
                  unit: el.querySelector(".context-unit-select")?.value || "語",
                  shortUnitConditions:
                    typeof getShortUnitConditions === "function"
                      ? getShortUnitConditions(el)
                      : [],
                }));

                const finalFilteredResultItems = filterResultsInMainThread(
                  candidateTokenIds,
                  keyConditionForMain,
                  preContextConditionsForMain,
                  postContextConditionsForMain,
                  appState.getCorpusData()
                );

                finalFilteredResultItems.sort(
                  (a, b) => a.tokenId - b.tokenId
                );

                appState.setUnitSearchResultIds(finalFilteredResultItems);
                appState.setUnitTotalHits(finalFilteredResultItems.length);
                appState.setUnitCurrentPage(1);

                if (typeof displayResults === "function") {
                  displayResults();
                } else {
                  console.error("displayResults function not found");
                }
              } catch (filterError) {
                console.error(
                  "[Search.js:onmessage] Error during unit main thread filtering:",
                  filterError
                );
                if (typeof displaySearchError === "function") {
                  displaySearchError(
                    "unit",
                    `結果の絞り込みエラー: ${
                      filterError.message || filterError
                    }`
                  );
                } else {
                  alert(
                    `結果の絞り込みエラー: ${
                      filterError.message || filterError
                    }`
                  );
                }
                if (typeof clearSearchResults === "function") {
                  clearSearchResults("unit");
                }
              }
            } else {
              console.error(
                "[Search.js] corpusData is not available for unit search result processing."
              );
              if (typeof displaySearchError === "function") {
                displaySearchError(
                  "unit",
                  "コーパスデータの読み込みに問題があり、結果を処理できません。"
                );
              } else {
                alert(
                  "コーパスデータの読み込みに問題があり、結果を処理できません。"
                );
              }
              if (typeof clearSearchResults === "function") {
                clearSearchResults("unit");
              }
            }
          } else {
            console.error(
              "[Search.js:onmessage] Unit search failed in worker or results missing. Worker error:",
              error
            );
            if (typeof displaySearchError === "function") {
              displaySearchError(
                "unit",
                `検索エラー(Worker): ${error || "不明なエラー"}`
              );
            } else {
              const statsEl = document.getElementById("unit-result-stats");
              if (statsEl) {
                statsEl.innerHTML = `<span class="search-error-message">検索エラー(Worker): ${
                  error || "不明なエラー"
                }</span>`;
              } else {
                alert(`検索エラー(Worker): ${error || "不明なエラー"}`);
              }
            }
            if (typeof clearSearchResults === "function") {
              clearSearchResults("unit");
            }
          }
        } else if (type === "stringSearchResult") {
          if (success && results) {
            const workerMatchInfos = results.tokenIds || [];
            const workerTotalHits =
              results.totalHits || workerMatchInfos.length;

            if (
              workerMatchInfos.length > 0 &&
              appState.getCorpusData()?.tokens
            ) {
              if (typeof showLoading === "function") {
                showLoading(true, "検索結果を処理中...", "search");
              }
              processStringSearchResultsInChunks(
                workerMatchInfos,
                workerTotalHits,
                (detailedResults, totalHits) => {
                  appState.setStringSearchResultObjects(detailedResults);
                  appState.setStringTotalHits(totalHits);
                  appState.setStringCurrentPage(1);

                  if (typeof displayStringResults === "function") {
                    displayStringResults();
                  }

                  if (typeof showLoading === "function") {
                    showLoading(false, "", "search");
                  }
                  updateSearchButtonState(false);
                }
              );
            } else {
              if (typeof showLoading === "function") {
                showLoading(false, "", "search");
              }
              updateSearchButtonState(false);
              appState.setStringSearchResultObjects([]);
              appState.setStringTotalHits(workerTotalHits);
              appState.setStringCurrentPage(1);
              if (typeof displayStringResults === "function") {
                displayStringResults();
              }
            }
          } else {
            console.error(
              "[Search.js:onmessage] String search failed in worker or results missing. Worker error:",
              error
            );
            if (typeof displaySearchError === "function") {
              displaySearchError(
                "string",
                `検索エラー(Worker): ${error || "不明なエラー"}`
              );
            } else {
              const statsEl = document.getElementById("string-result-stats");
              if (statsEl) {
                statsEl.innerHTML = `<span class="search-error-message">検索エラー(Worker): ${
                  error || "不明なエラー"
                }</span>`;
              } else {
                alert(`検索エラー(Worker): ${error || "不明なエラー"}`);
              }
            }
            if (typeof clearSearchResults === "function") {
              clearSearchResults("string");
            }
          }
        }
      };

      searchWorker.onerror = function (err) {
        console.error(
          "[Search.js:initializeSearchWorker] Worker onerror triggered. Error:",
          err
        );
        isWorkerSearching = false;
        isWorkerReady = false;
        updateSearchButtonState(false);
        reject(err);
      };
    } catch (errInit) {
      console.error(
        "[Search.js:initializeSearchWorker] Outer catch triggered. Error:",
        errInit
      );
      reject(errInit);
    }
  });
}

export function sendDataToWorker(corpusDataForWorker, indexDataForWorker) {
  if (!searchWorker) {
    console.error(
      "[Search.js:sendDataToWorker] Worker is not initialized at all. Cannot send data."
    );
    return;
  }
  if (!isWorkerReady) {
    console.warn(
      `[Search.js:sendDataToWorker] Worker not ready (isWorkerReady: ${isWorkerReady}). Data send attempt deferred or skipped.`
    );
    return;
  }

  const corpusToSend = corpusDataForWorker;
  const indexToSend = indexDataForWorker;
  const statsToSend = corpusToSend?.statistics;
  const metadataToSend = corpusToSend?.file_metadata;

  if (
    !corpusToSend?.tokens ||
    !indexToSend ||
    !statsToSend ||
    !metadataToSend
  ) {
    console.error(
      `[Search.js:sendDataToWorker] Data to send is incomplete. Aborting.`,
      {
        tokens: !!corpusToSend?.tokens,
        index: !!indexToSend,
        stats: !!statsToSend,
        metadata: !!metadataToSend,
      }
    );
    appState.setIsWorkerDataLoaded(false);
    updateSearchButtonState();
    return;
  }

  appState.setIsWorkerDataLoaded(false);
  updateSearchButtonState();
  try {
    const corpusDataInfo = {
      tokenCount: corpusToSend.tokens.length,
      tokenIdToFileMap: corpusToSend.tokens.map((t) => t?.ファイル名 || null),
      tokenIdToSurfaceMap: corpusToSend.tokens.map(
        (t) => t?.書字形出現形 || null
      ),

      tokenIdToPosMap: corpusToSend.tokens.map((t) => t?.品詞 || null),
      tokenIdToLemmaMap: corpusToSend.tokens.map((t) => t?.語彙素 || null),
      tokenIdToConjTypeMap: corpusToSend.tokens.map((t) => t?.活用型 || null),
      tokenIdToConjFormMap: corpusToSend.tokens.map((t) => t?.活用形 || null),
      tokenIdToPronunciationMap: corpusToSend.tokens.map((t) => t?.発音形出現形 || null),
      tokenIdToLemmaReadingMap: corpusToSend.tokens.map((t) => t?.語彙素読み || null),
    };

    const messageId = `loadData_${Date.now()}`;
    searchWorker.postMessage({
      type: "loadData",
      payload: {
        corpusDataInfo,
        indexData: indexToSend,
        fileMetadata: metadataToSend,
        statsData: statsToSend,
      },
      messageId: messageId,
    });
  } catch (error) {
    console.error(
      "[Search.js:sendDataToWorker] Error posting data to worker:",
      error
    );
    alert("検索エンジンへのデータ送信中にエラーが発生しました。");
    appState.setIsWorkerDataLoaded(false);
    updateSearchButtonState();
  }
}

export function getIsWorkerReady() {
  return isWorkerReady;
}

function displaySearchError(type, message) {
  const statsElId =
    type === "unit" ? "unit-result-stats" : "string-result-stats";
  const statsEl = document.getElementById(statsElId);
  if (statsEl) {
    const resultsAreaId = type === "unit" ? "unit-results" : "string-results";
    const resultsArea = document.getElementById(resultsAreaId);
    if (resultsArea && getComputedStyle(resultsArea).display === "none") {
      resultsArea.style.display = "block";
    }
    statsEl.innerHTML = `<div class="search-error-message">${message}</div>`;

    const tableResultsId =
      type === "unit" ? "table-results" : "string-table-results";
    const tableBodyId =
      type === "unit" ? "results-table-body" : "string-results-table-body";
    const paginationId = type === "unit" ? "pagination" : "string-pagination";

    const tableResults = document.getElementById(tableResultsId);
    const tableBody = document.getElementById(tableBodyId);
    const pagination = document.getElementById(paginationId);

    if (tableResults) tableResults.style.display = "none";
    if (tableBody) tableBody.innerHTML = "";
    if (pagination) {
      pagination.innerHTML = "";
      pagination.style.display = "none";
    }
  } else {
    console.warn(
      `[SearchJS] Stats element #${statsElId} not found for error display.`
    );
    alert(message.replace(/<[^>]*>?/gm, ""));
  }
}

async function performUnitSearchCoreModified(
  searchWorkerInstance,
  isWorkerDataLoadedState,
  isWorkerSearchingState,
  showLoadingFunc,
  clearSearchResultsFunc,
  updateSearchButtonStateFunc,
  getVolumeFilterSettingsFunc,
  displayErrorFunc,
  keyConditionForWorker
) {
  if (!isWorkerDataLoadedState) {
    console.warn("[SearchCore] Worker data not loaded. Aborting unit search.");
    if (typeof displayErrorFunc === "function") {
      displayErrorFunc(
        "unit",
        "検索データが準備できていません。しばらく待ってから再度お試しください。"
      );
    }
    return;
  }
  if (isWorkerSearchingState) {
    console.warn("[SearchCore] Search in progress. Aborting unit search.");
    return;
  }
  if (!searchWorkerInstance) {
    console.error(
      "[SearchCore] Worker instance not provided. Aborting unit search."
    );
    if (typeof displayErrorFunc === "function") {
      displayErrorFunc("unit", "検索エンジンの準備ができていません。");
    }
    return;
  }

  const validationResult = validateSearchConditions();
  if (!validationResult.isValid) {
    const errorMessageHtml = validationResult.errors
      .map((err) => `<p>${err}</p>`)
      .join("");
    if (typeof displayErrorFunc === "function") {
      displayErrorFunc(
        "unit",
        `<strong>検索条件エラー:</strong>${errorMessageHtml}`
      );
    }
    clearSearchResultsFunc("unit");
    return;
  }

  clearSearchResultsFunc("unit");

  const { volumeFilterValues, manuscriptFilterValues } = getVolumeFilterSettingsFunc();

  showLoadingFunc(true, "検索中...", "search");
  updateSearchButtonStateFunc(true);

  try {
    searchWorkerInstance.postMessage({
      type: "unitSearch",
      payload: {
        keyCondition: keyConditionForWorker,
        volumeFilterValues,
        manuscriptFilterValues,
      },
    });
  } catch (postError) {
    console.error(
      "[SearchCore] Error posting unit search message to worker:",
      postError
    );
    if (typeof displayErrorFunc === "function") {
      displayErrorFunc("unit", "検索エンジンへの指示送信に失敗しました。");
    }
    showLoadingFunc(false, "", "search");
    updateSearchButtonStateFunc(false);
  }
}
