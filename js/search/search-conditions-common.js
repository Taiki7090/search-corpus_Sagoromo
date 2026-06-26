import * as appState from "../store/app-state.js";
import { updateContextCounts } from "./search-context-conditions.js";
import {
  updateColumnVisibility,
  updateStringColumnVisibility,
} from "../ui/ui-table.js";
import { addShortUnitButtonToMainCondition } from "./search-short-unit-conditions.js";

export function getFormattedSingleCondition(conditionElement) {
  const conditionType = conditionElement.querySelector(".condition-type").value;
  let conditionValue = "";
  let isDropdownValue = false;

  if (
    conditionType === "品詞" ||
    conditionType === "活用型" ||
    conditionType === "活用形"
  ) {
    const selectElement = conditionElement.querySelector(
      ".search-condition-input select.condition-value"
    );
    if (selectElement) {
      conditionValue = selectElement.value;
      isDropdownValue = true;
    }
  } else {
    const inputElement = conditionElement.querySelector(
      ".search-condition-input input.condition-value"
    );
    if (inputElement) {
      conditionValue = inputElement.value;
    }
  }

  if (isDropdownValue) {
    return `${conditionType} LIKE "${conditionValue}%"`;
  } else {
    return `${conditionType}="${conditionValue}"`;
  }
}

export function getFormattedShortUnitConditionsText(parentElement) {
  if (!parentElement || !parentElement.dataset.conditionId) return "";

  const containerId =
    "short-unit-container-" + parentElement.dataset.conditionId;
  const shortUnitContainer = document.getElementById(containerId);
  if (
    !shortUnitContainer &&
    parentElement.classList.contains("search-condition") &&
    parentElement.dataset.isKey === "true"
  ) {
    return getFormattedSingleCondition(parentElement);
  }
  if (!shortUnitContainer) return "";

  const shortUnitElements = shortUnitContainer.querySelectorAll(
    ".short-unit-condition"
  );
  if (shortUnitElements.length === 0)
    return getFormattedSingleCondition(parentElement);

  const conditionTexts = [];
  conditionTexts.push(getFormattedSingleCondition(parentElement));

  shortUnitElements.forEach((element, index) => {
    const logic = element.querySelector(".short-unit-condition-logic").value;
    const conditionType = element.querySelector(
      ".short-unit-condition-type"
    ).value;
    let conditionValue = "";
    let isDropdownValue = false;

    const valueContainer = element.querySelector(".short-unit-condition-input");
    if (!valueContainer) {
      console.warn(`短単位条件 #${index + 1}: 値コンテナが見つかりません`);
      return;
    }

    if (["品詞", "活用型", "活用形"].includes(conditionType)) {
      const select = valueContainer.querySelector("select.condition-value");
      if (select) {
        let val = select.getAttribute("data-value") || select.value || "";
        if (val && !val.endsWith("%")) {
          val += "%";
        }
        conditionValue = val;
        isDropdownValue = true;
      } else {
        console.warn(
          `短単位条件 #${
            index + 1
          }: ${conditionType}用のセレクトが見つかりません`
        );
      }
    } else {
      const input = valueContainer.querySelector("input.condition-value");
      if (input) {
        conditionValue = input.value;
      } else {
        console.warn(
          `短単位条件 #${index + 1}: 入力フィールドが見つかりません`
        );
      }
    }

    if (conditionValue) {
      const formatted = isDropdownValue
        ? `${conditionType} LIKE "${conditionValue}"`
        : `${conditionType}="${conditionValue}"`;

      const prefix = logic === "NOT" ? "AND NOT" : logic;
      conditionTexts.push(`${prefix} ${formatted}`);
    } else {
      console.warn(`短単位条件 #${index + 1}: 値が空のため条件に追加しません`);
    }
  });

  const result = conditionTexts.join(" ");
  return result;
}

export function clearAllConditions() {
  const keyCondition = document.querySelector(
    '.search-condition[data-is-key="true"]'
  );
  const keyConditionId = keyCondition ? keyCondition.dataset.conditionId : null;
  if (keyConditionId) {
    const keyShortUnitContainerId = "short-unit-container-" + keyConditionId;
    const keyShortUnitContainer = document.getElementById(
      keyShortUnitContainerId
    );
    if (keyShortUnitContainer) keyShortUnitContainer.remove();
  }
  const preContextContainer = document.getElementById("pre-context-conditions");
  if (preContextContainer) {
    preContextContainer.innerHTML = "";
    preContextContainer.style.display = "none";
  }
  const postContextContainer = document.getElementById(
    "post-context-conditions"
  );
  if (postContextContainer) {
    postContextContainer.innerHTML = "";
    postContextContainer.style.display = "none";
  }
  document
    .querySelectorAll(".short-unit-conditions-container")
    .forEach((container) => {
      container.remove();
    });

  if (keyCondition) {
    const inputContainer = keyCondition.querySelector(
      ".search-condition-input"
    );
    if (inputContainer) {
      inputContainer.innerHTML = "";
      const newInput = document.createElement("input");
      newInput.type = "text";
      newInput.className = "condition-value";
      newInput.placeholder = "短単位の文字列を入力";
      inputContainer.appendChild(newInput);
    }
    const typeSelect = keyCondition.querySelector(".condition-type");
    if (typeSelect) {
      typeSelect.value = "書字形出現形";
      typeSelect.dispatchEvent(new Event("change"));
    }
    const shortUnitButton = keyCondition.querySelector(
      ".add-short-unit-button"
    );
    if (shortUnitButton) {
      shortUnitButton.style.display = "";
      shortUnitButton.disabled = false;
      shortUnitButton.classList.remove("disabled");
    } else {
      if (typeof addShortUnitButtonToMainCondition === "function") {
        addShortUnitButtonToMainCondition(keyCondition);
      }
    }
  } else {
    console.warn("キー条件が見つかりません");
  }

  const contextSeparator = document.getElementById("context-separator");
  if (contextSeparator) contextSeparator.value = "|";
  const contextSize = document.getElementById("context-size");
  if (contextSize) contextSize.value = "20";
  const contextBoundary = document.getElementById("context-boundary");
  if (contextBoundary) contextBoundary.value = "not-cross";

  document.querySelectorAll('input[name="volume-filter"]').forEach((cb) => {
    if (!cb.disabled) cb.checked = true;
  });
  document
    .querySelectorAll('input[name="string-volume-filter"]').forEach((cb) => {
      if (!cb.disabled) cb.checked = true;
    });

  if (typeof updateContextCounts === "function") {
    updateContextCounts();
  } else {
    console.warn(
      "updateContextCounts function is not available to reset context buttons."
    );
    const addPreBtn = document.getElementById("add-pre-context-button");
    if (addPreBtn) {
      addPreBtn.disabled = false;
      addPreBtn.classList.remove("disabled");
      addPreBtn.title = "前方共起条件を追加します（最大5つ）";
    }
    const addPostBtn = document.getElementById("add-post-context-button");
    if (addPostBtn) {
      addPostBtn.disabled = false;
      addPostBtn.classList.remove("disabled");
      addPostBtn.title = "後方共起条件を追加します（最大5つ）";
    }
  }

  const unitDisplayCheckboxes = document.querySelectorAll(
    'input[name="display-column"]'
  );
  unitDisplayCheckboxes.forEach((cb) => {
    const parentGroup = cb.closest(".checkbox-group");
    if (cb.value === "キー" || cb.id === "col-key") {
      cb.checked = true;
      cb.disabled = true;
    } else if (
      parentGroup &&
      parentGroup.style.display !== "none" &&
      !cb.defaultDisabled
    ) {
      cb.checked = cb.defaultChecked;
      cb.disabled = false;
    } else if (parentGroup && parentGroup.style.display === "none") {
      cb.checked = false;
      cb.disabled = true;
    } else {
      cb.checked = cb.defaultChecked;
      cb.disabled = cb.defaultDisabled || false;
    }
  });

  if (typeof updateColumnVisibility === "function") {
    updateColumnVisibility();
  } else {
    console.warn("updateColumnVisibility function not found for unit clear.");
  }

  const unitResultsArea = document.getElementById("unit-results");
  const unitStatsArea = document.getElementById("unit-result-stats");
  const unitTableResults = document.getElementById("table-results");
  const unitTableBody = document.getElementById("results-table-body");
  const unitPagination = document.getElementById("pagination");
  if (unitResultsArea) unitResultsArea.style.display = "none";
  if (unitStatsArea) unitStatsArea.innerHTML = "";
  if (unitTableResults) unitTableResults.style.display = "none";
  if (unitTableBody) unitTableBody.innerHTML = "";
  if (unitPagination) {
    unitPagination.innerHTML = "";
    unitPagination.style.display = "none";
  }
  const mainStatsArea = document.getElementById("result-stats");
  if (mainStatsArea) mainStatsArea.textContent = "";

  setTimeout(() => {
    if (typeof updateContextCounts === "function") {
      updateContextCounts();
    }
  }, 50);
}

export function clearStringConditions() {
  const queryInput = document.getElementById("search-query");
  if (queryInput) queryInput.value = "";
  else console.warn("search-query input not found for clearing.");

  const wildcardRadio = document.getElementById("string-search-mode-wildcard");
  if (wildcardRadio) wildcardRadio.checked = true;

  const sepSelect = document.getElementById("string-context-separator");
  if (sepSelect) sepSelect.value = "|";
  const sizeSelect = document.getElementById("string-context-size");
  if (sizeSelect) sizeSelect.value = "20";

  document
    .querySelectorAll('input[name="string-volume-filter"]')
    .forEach((cb) => {
      if (!cb.disabled) cb.checked = true;
    });

  const stringDisplayCheckboxes = document.querySelectorAll(
    'input[name="string-display-column"]'
  );
  stringDisplayCheckboxes.forEach((cb) => {
    if (
      typeof defaultStringDisplayColumns !== "undefined" &&
      Array.isArray(defaultStringDisplayColumns)
    ) {
      if (!cb.disabled) {
        cb.checked = defaultStringDisplayColumns.includes(cb.value);
      }
    } else {
      if (!cb.disabled && cb.value !== "キー") {
        cb.checked = cb.defaultChecked;
      } else if (cb.value === "キー") {
        cb.checked = true;
        cb.disabled = true;
      }
    }
  });
  if (typeof updateStringColumnVisibility === "function") {
    updateStringColumnVisibility();
  } else {
    console.warn(
      "updateStringColumnVisibility function not found for string clear."
    );
  }

  const stringPagination = document.getElementById("string-pagination");
  if (stringPagination) {
    stringPagination.innerHTML = "";
    stringPagination.style.display = "none";
  } else {
    console.warn("string-pagination element not found for clearing.");
  }
  const stringResultsArea = document.getElementById("string-results");
  if (stringResultsArea) stringResultsArea.style.display = "none";
  const stringResultStats = document.getElementById("string-result-stats");
  if (stringResultStats) stringResultStats.innerHTML = "";
  const stringTableBody = document.getElementById("string-results-table-body");
  if (stringTableBody) stringTableBody.innerHTML = "";
  const stringTableResults = document.getElementById("string-table-results");
  if (stringTableResults) stringTableResults.style.display = "none";

  appState.setStringTotalHits(0);
  appState.setStringCurrentPage(1);
  appState.setStringSearchResultObjects([]);
}

export function clearSearchResults(type = null) {
  if (type === "unit" || type === null) {
    appState.setUnitSearchResultIds([]);
    appState.setUnitTotalHits(0);
    appState.setUnitCurrentPage(1);

    const unitResults = document.getElementById("unit-results");
    if (unitResults) unitResults.style.display = "none";
    const unitStats = document.getElementById("unit-result-stats");
    if (unitStats) unitStats.innerHTML = "";
    const unitTableResults = document.getElementById("table-results");
    if (unitTableResults) unitTableResults.style.display = "none";
    const unitTHeadTr = document.querySelector("#results-table thead tr");
    if (unitTHeadTr) unitTHeadTr.innerHTML = "";
    const unitTBody = document.getElementById("results-table-body");
    if (unitTBody) unitTBody.innerHTML = "";
    const unitPagi = document.getElementById("pagination");
    if (unitPagi) {
      unitPagi.innerHTML = "";
      unitPagi.style.display = "none";
    }
  }

  if (type === "string" || type === null) {
    appState.setStringSearchResultObjects([]);
    appState.setStringTotalHits(0);
    appState.setStringCurrentPage(1);

    const strResults = document.getElementById("string-results");
    if (strResults) strResults.style.display = "none";
    const strStats = document.getElementById("string-result-stats");
    if (strStats) strStats.innerHTML = "";
    const strTableResults = document.getElementById("string-table-results");
    if (strTableResults) strTableResults.style.display = "none";
    const strTHeadTr = document.querySelector("#string-results-table thead tr");
    if (strTHeadTr) strTHeadTr.innerHTML = "";
    const strTBody = document.getElementById("string-results-table-body");
    if (strTBody) strTBody.innerHTML = "";
    const strPagi = document.getElementById("string-pagination");
    if (strPagi) {
      strPagi.innerHTML = "";
      strPagi.style.display = "none";
    }
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const clearButton = document.getElementById("clear-search-conditions");
  if (clearButton) {
    clearButton.addEventListener("click", clearAllConditions);
  }
  const stringClearButton = document.getElementById("string-clear-conditions");
  if (stringClearButton) {
    stringClearButton.addEventListener("click", clearStringConditions);
  }
});
