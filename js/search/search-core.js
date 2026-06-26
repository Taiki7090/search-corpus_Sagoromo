import {
  validateSearchConditions,
  validateStringSearchInput,
} from "./search-validator.js";

export async function performUnitSearch(
  searchWorkerInstance,
  isWorkerDataLoadedState,
  isWorkerSearchingState,
  showLoadingFunc,
  clearSearchResultsFunc,
  updateSearchButtonStateFunc,
  getVolumeFilterSettingsFunc,
  displayErrorFunc
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
  const keyConditionForWorker = { type: keyType, value: keyValue };

  const { volumeFilterValues } = getVolumeFilterSettingsFunc();

  showLoadingFunc(true, "検索中...", "search");
  updateSearchButtonStateFunc(true);

  try {
    searchWorkerInstance.postMessage({
      type: "unitSearch",
      payload: {
        keyCondition: keyConditionForWorker,
        volumeFilterValues,
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

export async function performStringSearch(
  searchWorkerInstance,
  isWorkerDataLoadedState,
  isWorkerSearchingState,
  showLoadingFunc,
  clearSearchResultsFunc,
  updateSearchButtonStateFunc,
  getStringVolumeFilterSettingsFunc,
  displayErrorFunc
) {
  const searchStartTime = performance.now();

  if (!isWorkerDataLoadedState) {
    console.warn(
      "[SearchCore] Worker data not loaded. Aborting string search."
    );
    if (typeof displayErrorFunc === "function") {
      displayErrorFunc(
        "string",
        "検索データが準備できていません。しばらく待ってから再度お試しください。"
      );
    }
    return;
  }
  if (isWorkerSearchingState) {
    console.warn("[SearchCore] Search in progress. Aborting string search.");
    return;
  }
  if (!searchWorkerInstance) {
    console.error(
      "[SearchCore] Worker instance not provided. Aborting string search."
    );
    if (typeof displayErrorFunc === "function") {
      displayErrorFunc("string", "検索エンジンの準備ができていません。");
    }
    return;
  }

  const validationResult = validateStringSearchInput();
  if (!validationResult.isValid) {
    const errorMessageHtml = validationResult.errors
      .map((err) => `<p>${err}</p>`)
      .join("");
    if (typeof displayErrorFunc === "function") {
      displayErrorFunc(
        "string",
        `<strong>検索条件エラー:</strong>${errorMessageHtml}`
      );
    }
    clearSearchResultsFunc("string");
    return;
  }

  clearSearchResultsFunc("string");

  const query = document.getElementById("search-query").value;
  const searchMode =
    document.querySelector('input[name="string-search-mode"]:checked')?.value ||
    "wildcard";

  const { volumeFilterValues, manuscriptFilterValues } =
    getStringVolumeFilterSettingsFunc();

  showLoadingFunc(true, "検索中...", "search");
  updateSearchButtonStateFunc(true);

  try {
    searchWorkerInstance.postMessage({
      type: "stringSearch",
      payload: { query, searchMode, volumeFilterValues, manuscriptFilterValues },
      startTime: searchStartTime,
    });
  } catch (postError) {
    console.error(
      "[SearchCore] Error posting string search message to worker:",
      postError
    );
    if (typeof displayErrorFunc === "function") {
      displayErrorFunc("string", "検索エンジンへの指示送信に失敗しました。");
    }
    showLoadingFunc(false, "", "search");
    updateSearchButtonStateFunc(false);
  }
}
