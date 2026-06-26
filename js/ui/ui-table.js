import {
  getCorpusData,
  getActiveDataSourceType,
  getUnitSearchResultIds,
  getUnitCurrentPage,
  getUnitResultsPerPage,
  getStringSearchResultObjects,
  getStringTotalHits,
  getStringCurrentPage,
  getStringResultsPerPage,
} from "../store/app-state.js";
import {
  getDisplayColumns,
  getStringDisplayColumns,
} from "../ui/ui-column-manager.js";
import {
  columnOrderInternalKeys,
  columnNameToIdMap,
  uploadHiddenInternalKeys,
  getDynamicColumnDisplayNames,
} from "../ui/ui-constants.js";
import { showModalMetadataTable } from "./ui-modal.js";
import { setupContextTooltips } from "../ui/ui-tooltip.js";
import { isValidValue } from "./ui-utils.js";
import {
  getContextTokens,
  getOriginalTextContextTokens,
} from "./ui-context.js";
import { setupSortableHeaders } from "./ui-table-sort.js";
import { escapeHtml } from "../utils/text-utils.js";
import { pageLineCellHtml } from "./ui-iiif-viewer.js";

function shouldRenderOriginalTextRow(internalKeys) {
  // Show the original-text second row whenever `原文文字列` is selected.
  // Individual cells in that row will be shown/hidden depending on
  // whether `前文脈` / `後文脈` are selected.
  return Array.isArray(internalKeys) && internalKeys.includes("原文文字列");
}

export function updateTableHeader(internalKeysToDisplay) {
  const headerRow = document.querySelector("#results-table thead tr");
  if (!headerRow) {
    console.error(
      "[UI:updateTableHeader] Header row '#results-table thead tr' not found."
    );
    return [];
  }
  headerRow.innerHTML = "";

  const currentCorpusData = getCorpusData();
  if (
    !currentCorpusData ||
    !currentCorpusData.tokens ||
    currentCorpusData.tokens.length === 0
  ) {
    console.warn(
      "[UI:updateTableHeader] corpusData.tokens is not available or empty. Cannot update header."
    );
    return [];
  }

  if (!Array.isArray(internalKeysToDisplay)) {
    console.error(
      "[UI:updateTableHeader] Invalid arg: internalKeysToDisplay received:",
      internalKeysToDisplay
    );
    return [];
  }

  const currentDisplayNamesToUse = getDynamicColumnDisplayNames(
    currentCorpusData.tokens
  );
  const displayedInternalKeys = [];

  const isOriginalTextRow = shouldRenderOriginalTextRow(
    internalKeysToDisplay
  );

  columnOrderInternalKeys.forEach((internalKey) => {
    if (internalKeysToDisplay.includes(internalKey)) {
      if (
        !currentDisplayNamesToUse.hasOwnProperty(internalKey) &&
        internalKey !== "キー"
      ) {
        console.warn(
          `[UI:updateTableHeader] Display name for internal key "${internalKey}" not found in currentDisplayNamesToUse. Skipping header cell.`
        );
        if (internalKey !== "原文文字列" || !isOriginalTextRow) {
          return;
        }
      }

      displayedInternalKeys.push(internalKey);

      if (internalKey === "原文文字列" && isOriginalTextRow) {
        return;
      }

      const th = document.createElement("th");
      const displayColumnName =
        currentDisplayNamesToUse[internalKey] || internalKey;
      const columnId = columnNameToIdMap[internalKey] || "";

      th.dataset.originalColumn = internalKey;
      th.textContent = displayColumnName;
      if (columnId) th.classList.add("col-" + columnId);

      th.classList.add("sortable");
      headerRow.appendChild(th);
    }
  });

  if (typeof setupSortableHeaders === "function") {
    setTimeout(() => {
      try {
        setupSortableHeaders("unit", displayPage);
      } catch (e) {
        console.error(
          "[UI:updateTableHeader] Error setting up sort handlers for unit:",
          e
        );
      }
    }, 0);
  }
  return displayedInternalKeys;
}

export function updateStringTableHeader(internalKeysToDisplay) {
  const headerRow = document.querySelector("#string-results-table thead tr");
  if (!headerRow) {
    console.error(
      "[UI:updateStringTableHeader] Header row '#string-results-table thead tr' not found."
    );
    return [];
  }
  headerRow.innerHTML = "";
  const currentCorpusData = getCorpusData();
  if (
    !currentCorpusData ||
    !currentCorpusData.tokens ||
    currentCorpusData.tokens.length === 0
  ) {
    console.warn(
      "[UI:updateStringTableHeader] corpusData.tokens is not available or empty. Cannot update header."
    );
    return [];
  }

  if (!Array.isArray(internalKeysToDisplay)) {
    console.error(
      "[UI:updateStringTableHeader] Invalid arg: internalKeysToDisplay received:",
      internalKeysToDisplay
    );
    return [];
  }

  const currentDisplayNamesToUse = getDynamicColumnDisplayNames(
    currentCorpusData.tokens
  );

  if (!currentDisplayNamesToUse) {
    console.error(
      "[UI:updateStringTableHeader] CRITICAL: currentDisplayNamesToUse is undefined! This should not happen if getDynamicColumnDisplayNames returns a valid object."
    );
    return [];
  }

  const isOriginalTextRow = shouldRenderOriginalTextRow(
    internalKeysToDisplay
  );
  const displayedInternalKeys = [];

  columnOrderInternalKeys.forEach((internalKey) => {
    if (internalKeysToDisplay.includes(internalKey)) {
      const displayName = currentDisplayNamesToUse[internalKey];

      if (displayName === undefined && internalKey !== "キー") {
        console.warn(
          `[UI:updateStringTableHeader] Display name for internal key "${internalKey}" is undefined in currentDisplayNamesToUse. Using internalKey as fallback.`
        );
      }
      if (
        !currentDisplayNamesToUse.hasOwnProperty(internalKey) &&
        internalKey !== "キー"
      ) {
        console.warn(
          `[UI:updateStringTableHeader] Display name for internal key "${internalKey}" not found in currentDisplayNamesToUse (hasOwnProperty check). Skipping header cell if not key.`
        );
      }
      displayedInternalKeys.push(internalKey);

      if (internalKey === "原文文字列" && isOriginalTextRow) {
        return;
      }

      const th = document.createElement("th");
      th.textContent = displayName || internalKey;
      const columnId = columnNameToIdMap[internalKey] || "";

      th.dataset.originalColumn = internalKey;
      if (columnId) th.classList.add("col-" + columnId);
      th.classList.add("sortable");
      headerRow.appendChild(th);
    }
  });

  if (typeof setupSortableHeaders === "function") {
    setTimeout(() => {
      try {
        setupSortableHeaders("string", displayStringPage);
      } catch (e) {
        console.error(
          "[UI:updateStringTableHeader] Error setting up sort handlers for string:",
          e
        );
      }
    }, 0);
  }
  return displayedInternalKeys;
}

function updateOriginalTextRowVisibility(tableElement, columnsToDisplay) {
  if (!tableElement || !Array.isArray(columnsToDisplay)) {
    return;
  }

  const shouldShowOriginalTextRow =
    columnsToDisplay.includes("原文文字列") &&
    columnsToDisplay.includes("キー");
  // Toggle visibility of the second-row (original text row)
  const secondRowTds = tableElement.querySelectorAll(
    'td[data-internal-key="原文前文脈"], td[data-internal-key="原文文字列"], td[data-internal-key="原文後文脈"]'
  );

  // Track which second-row TR elements we've processed to avoid duplicates
  const processedSecondRows = new Set();

  secondRowTds.forEach((td) => {
    const secondRow = td.closest("tr");
    if (!secondRow || processedSecondRows.has(secondRow)) return;
    processedSecondRows.add(secondRow);

    // Show/hide the second row
    secondRow.style.display = shouldShowOriginalTextRow ? "" : "none";

    // Find the corresponding first row (assumed to be the previous sibling)
    const firstRow = secondRow.previousElementSibling;
    if (!firstRow) return;

    // Adjust rowSpan for the first-row cells that were set to span 2 when original row shown
    const nonContextSelector = 'td[data-internal-key]:not([data-internal-key="前文脈"]):not([data-internal-key="キー"]):not([data-internal-key="後文脈"])';
    firstRow.querySelectorAll(nonContextSelector).forEach((firstTd) => {
      try {
        firstTd.rowSpan = shouldShowOriginalTextRow ? 2 : 1;
      } catch (e) {
        // ignore in environments where rowSpan is read-only or unsupported
      }
    });
  });
}

export function updateColumnVisibility() {
  const tableElement = document.getElementById("results-table");
  if (!tableElement) {
    console.error("#results-table not found for column visibility update.");
    return;
  }
  const colgroup = tableElement.querySelector("colgroup");

  try {
    const originalColumns = getDisplayColumns();
    if (typeof updateTableHeader === "function") {
      updateTableHeader(originalColumns);
    } else {
      console.error("updateTableHeader function not found!");
    }
  } catch (e) {
    console.error("Error updating table header in updateColumnVisibility:", e);
  }

  const isUpload =
    getActiveDataSourceType() === "upload" ||
    getActiveDataSourceType() === "default";

  for (const internalColumnKey in columnNameToIdMap) {
    if (Object.hasOwnProperty.call(columnNameToIdMap, internalColumnKey)) {
      const columnId = columnNameToIdMap[internalColumnKey];
      const className = `hide-col-${columnId}`;
      tableElement.classList.remove(className);

      if (colgroup) {
        const colElement = colgroup.querySelector(`.col-${columnId}`);
        if (colElement) {
          colElement.style.display = "";
        }
      }
    }
  }

  const allCheckboxes = document.querySelectorAll(
    'input[name="display-column"]'
  );
  allCheckboxes.forEach((checkbox) => {
    const internalKey = checkbox.value;
    const parentGroup = checkbox.closest(".checkbox-group");
    const isCheckboxVisible =
      parentGroup && parentGroup.style.display !== "none";
    const shouldShow =
      isCheckboxVisible && (checkbox.checked || checkbox.disabled);

    if (!shouldShow && columnNameToIdMap[internalKey]) {
      const columnId = columnNameToIdMap[internalKey];
      const className = `hide-col-${columnId}`;
      tableElement.classList.add(className);

      if (colgroup) {
        const colElement = colgroup.querySelector(`.col-${columnId}`);
        if (colElement) {
          colElement.style.display = "none";
        }
      }
    }
  });

  if (isUpload) {
    uploadHiddenInternalKeys.forEach((internalKey) => {
      if (columnNameToIdMap[internalKey]) {
        const columnId = columnNameToIdMap[internalKey];
        const className = `hide-col-${columnId}`;
        tableElement.classList.add(className);

        if (colgroup) {
          const colElement = colgroup.querySelector(`.col-${columnId}`);
          if (colElement) {
            colElement.style.display = "none";
          }
        }
      }
    });
  }

  const currentColumns = getDisplayColumns();
  updateOriginalTextRowVisibility(tableElement, currentColumns);
}

export function updateStringColumnVisibility() {
  const tableElement = document.getElementById("string-results-table");
  if (!tableElement) {
    console.error(
      "#string-results-table not found for column visibility update."
    );
    return;
  }
  const colgroup = tableElement.querySelector("colgroup");

  try {
    const originalColumns = getStringDisplayColumns();
    if (typeof updateStringTableHeader === "function") {
      updateStringTableHeader(originalColumns);
    } else {
      console.error("updateStringTableHeader function not found!");
    }
  } catch (e) {
    console.error(
      "Error updating string table header in updateStringColumnVisibility:",
      e
    );
  }

  const isUpload =
    getActiveDataSourceType() === "upload" ||
    getActiveDataSourceType() === "default";

  for (const internalColumnKey in columnNameToIdMap) {
    if (Object.hasOwnProperty.call(columnNameToIdMap, internalColumnKey)) {
      const columnId = columnNameToIdMap[internalColumnKey];
      const className = `hide-col-${columnId}`;
      tableElement.classList.remove(className);

      if (colgroup) {
        const colElement = colgroup.querySelector(`.col-${columnId}`);
        if (colElement) {
          colElement.style.display = "";
        }
      }
    }
  }

  const allCheckboxes = document.querySelectorAll(
    'input[name="string-display-column"]'
  );
  allCheckboxes.forEach((checkbox) => {
    const internalKey = checkbox.value;
    const parentGroup = checkbox.closest(".checkbox-group");
    const isCheckboxVisible =
      parentGroup && parentGroup.style.display !== "none";
    const shouldShow =
      isCheckboxVisible && (checkbox.checked || checkbox.disabled);

    if (!shouldShow && columnNameToIdMap[internalKey]) {
      const columnId = columnNameToIdMap[internalKey];
      const className = `hide-col-${columnId}`;
      tableElement.classList.add(className);

      if (colgroup) {
        const colElement = colgroup.querySelector(`.col-${columnId}`);
        if (colElement) {
          colElement.style.display = "none";
        }
      }
    }
  });

  if (isUpload) {
    uploadHiddenInternalKeys.forEach((internalKey) => {
      if (columnNameToIdMap[internalKey]) {
        const columnId = columnNameToIdMap[internalKey];
        const className = `hide-col-${columnId}`;
        tableElement.classList.add(className);

        if (colgroup) {
          const colElement = colgroup.querySelector(`.col-${columnId}`);
          if (colElement) {
            colElement.style.display = "none";
          }
        }
      }
    });
  }

  const currentColumns = getStringDisplayColumns();
  updateOriginalTextRowVisibility(tableElement, currentColumns);
}

export function displayPage(
  currentPageNum = getUnitCurrentPage() || 1,
  pageSize = getUnitResultsPerPage() || 20
) {
  const resultItems = getUnitSearchResultIds() || [];
  const tableBody = document.getElementById("results-table-body");
  const tableResults = document.getElementById("table-results");

  if (!tableBody || !tableResults) {
    console.error("[displayPage] Table body or results container not found.");
    if (tableResults) tableResults.style.display = "none";
    return;
  }

  let sortedOriginalColumns = [];
  try {
    const originalColumns = getDisplayColumns();
    sortedOriginalColumns =
      typeof updateTableHeader === "function"
        ? updateTableHeader(originalColumns)
        : originalColumns;
    if (
      !Array.isArray(sortedOriginalColumns) ||
      sortedOriginalColumns.length === 0
    ) {
      throw new Error("Invalid columns received from updateTableHeader");
    }
    if (typeof updateColumnVisibility === "function") {
      updateColumnVisibility();
    } else {
      console.warn("[displayPage] updateColumnVisibility function not found.");
    }
  } catch (e) {
    console.error(
      "[displayPage] Error getting/updating columns/visibility:",
      e
    );
    if (tableBody)
      tableBody.innerHTML =
        '<tr><td colspan="100%">列情報エラーが発生しました。</td></tr>';
    if (tableResults) tableResults.style.display = "none";
    return;
  }

  const start = (currentPageNum - 1) * pageSize;
  const end = Math.min(start + pageSize, resultItems.length);
  const pageItems = resultItems.slice(start, end);

  const allTokens = getCorpusData()?.tokens;
  const separatorElement = document.getElementById("context-separator");
  const separatorValue = separatorElement ? separatorElement.value : "|";
  const contextSeparatorText = separatorValue === "none" ? "" : separatorValue;
  const contextSizeElement = document.getElementById("context-size");
  const actualContextSize =
    parseInt(contextSizeElement ? contextSizeElement.value : "20", 10) || 20;

  if (typeof displayTableResults === "function") {
    displayTableResults(
      pageItems,
      sortedOriginalColumns,
      allTokens,
      contextSeparatorText,
      actualContextSize
    );
  } else {
    console.error("[displayPage] displayTableResults function not found!");
    if (tableBody)
      tableBody.innerHTML =
        '<tr><td colspan="100%">テーブル描画関数の読み込みに失敗しました。</td></tr>';
  }
}

export function displayStringPage(
  currentPageNum = getStringCurrentPage() || 1,
  resultsPerPage = getStringResultsPerPage() || 20
) {
  const results = getStringSearchResultObjects() || [];
  const totalHits = getStringTotalHits() || 0;

  const tableBody = document.getElementById("string-results-table-body");
  const tableResults = document.getElementById("string-table-results");

  if (!tableBody || !tableResults) {
    console.error("[displayStringPage] Table body or container not found.");
    return;
  }

  if (totalHits === 0) {
    tableBody.innerHTML = "";
    tableResults.style.display = "none";
    const pagination = document.getElementById("string-pagination");
    if (pagination) {
      pagination.innerHTML = "";
      pagination.style.display = "none";
    }
    return;
  } else {
    tableResults.style.display = "block";
  }

  let sortedOriginalColumns = [];
  try {
    const originalColumns = getStringDisplayColumns();
    sortedOriginalColumns =
      typeof updateStringTableHeader === "function"
        ? updateStringTableHeader(originalColumns)
        : originalColumns;
    if (
      !Array.isArray(sortedOriginalColumns) ||
      sortedOriginalColumns.length === 0
    ) {
      throw new Error("Header update returned invalid keys");
    }
    if (typeof updateStringColumnVisibility === "function") {
      updateStringColumnVisibility();
    } else {
      console.warn(
        "[displayStringPage] updateStringColumnVisibility function not found."
      );
    }
  } catch (e) {
    console.error(
      "[displayStringPage] Error getting/updating string columns/visibility:",
      e
    );
    if (tableBody) {
      tableBody.innerHTML =
        '<tr><td colspan="100%">列情報エラーが発生しました。</td></tr>';
    }
    if (tableResults) tableResults.style.display = "none";
    return;
  }

  const start = (currentPageNum - 1) * resultsPerPage;
  const end = Math.min(start + resultsPerPage, totalHits);
  const pageResults = results.slice(start, end);

  const allTokens = getCorpusData()?.tokens;
  const separatorElement = document.getElementById("string-context-separator");
  const separatorValue = separatorElement ? separatorElement.value : "|";
  const contextSeparatorText = separatorValue === "none" ? "" : separatorValue;
  const contextSizeElement = document.getElementById("string-context-size");
  const actualContextSize =
    parseInt(contextSizeElement ? contextSizeElement.value : "20", 10) || 20;

  if (typeof displayStringTableResults === "function") {
    displayStringTableResults(
      pageResults,
      sortedOriginalColumns,
      allTokens,
      contextSeparatorText,
      actualContextSize
    );
  } else {
    console.error(
      "[displayStringPage] displayStringTableResults function not found!"
    );
    if (tableBody) {
      tableBody.innerHTML =
        '<tr><td colspan="100%">テーブル描画関数の読み込みに失敗しました。</td></tr>';
    }
  }
}

function displayTableResults(
  pageItems,
  columnsToDisplay,
  allTokens,
  contextSeparatorText,
  actualContextSize
) {
  const tableBody = document.getElementById("results-table-body");
  if (!tableBody) {
    console.error(
      "[displayTableResults] Table body #results-table-body not found."
    );
    return;
  }
  tableBody.innerHTML = "";

  if (pageItems.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();

  pageItems.forEach((item) => {
    const tokenId = item.tokenId;
    const tr = document.createElement("tr");
    tr.dataset.tokenId = tokenId;
    if (item.hasOwnProperty("combinationIndex")) {
      tr.dataset.combinationIndex = item.combinationIndex;
    }

    const token = allTokens ? allTokens[tokenId] : null;
    const metadata = token
      ? getCorpusData()?.file_metadata?.[token.ファイル名] || {}
      : {};

    const highlightForThisRow = {
      pre: item.preHighlightIds,
      post: item.postHighlightIds,
    };

    const contextInfo = getContextTokens(
      tokenId,
      allTokens,
      contextSeparatorText,
      actualContextSize,
      highlightForThisRow
    );

    const showOriginalTextRow =
      columnsToDisplay.includes("原文文字列") &&
      columnsToDisplay.includes("キー");

    columnsToDisplay.forEach((internalKey) => {
      if (internalKey === "原文文字列" && showOriginalTextRow) {
        return;
      }

      const td = document.createElement("td");
      td.dataset.internalKey = internalKey;
      let cellContent = "";

      if (!["前文脈", "キー", "後文脈"].includes(internalKey)) {
        td.rowSpan = showOriginalTextRow ? 2 : 1;
      }

      if (token) {
        switch (internalKey) {
          case "ファイル名":
            cellContent = escapeHtml(token.ファイル名 || "");
            break;
          case "開始文字位置":
            cellContent = `<a href="javascript:void(0)">${escapeHtml(
              String(token.開始文字位置 ?? "")
            )}</a>`;
            break;
          case "終了文字位置":
            cellContent = escapeHtml(token.終了文字位置 || "");
            break;
          case "文境界":
            cellContent = escapeHtml(token.文境界 || "");
            break;
          case "前文脈":
            cellContent = contextInfo.preContextText;
            td.classList.add("context-cell");
            break;
          case "キー":
            cellContent = `<span class="key-token">${escapeHtml(
              token.書字形出現形 || ""
            )}</span>`;
            break;
          case "後文脈":
            cellContent = contextInfo.postContextText;
            td.classList.add("context-cell");
            break;
          case "語彙素":
            cellContent = escapeHtml(token.語彙素 || "");
            break;
          case "語彙素読み":
            cellContent = escapeHtml(token.語彙素読み || "");
            break;
          case "品詞":
            cellContent = escapeHtml(token.品詞 || "");
            break;
          case "活用型":
            cellContent = escapeHtml(token.活用型 || "");
            break;
          case "活用形":
            cellContent = escapeHtml(token.活用形 || "");
            break;
          case "発音形出現形":
            cellContent = escapeHtml(token.発音形出現形 || "");
            break;
          case "語種":
            cellContent = escapeHtml(token.語種 || "");
            break;
          case "原文文字列":
            cellContent = escapeHtml(token.原文文字列 || "");
            break;
          case "巻名":
            const volumeValue =
              getActiveDataSourceType() === "upload"
                ? token.巻名
                : metadata.recording_volume || token.巻名;
            cellContent = escapeHtml(String(volumeValue ?? ""));
            break;
          case "話者数":
            cellContent = escapeHtml(String(metadata.speaker_count ?? ""));
            break;
          case "話者ID":
            cellContent = escapeHtml(
              metadata.speaker_id ||
                (getActiveDataSourceType() === "upload" ? token.話者ID : "") ||
                ""
            );
            break;
          case "年齢":
            cellContent = escapeHtml(String(metadata.speaker_age ?? ""));
            break;
          case "page-lineBegining": {
            const pl = token["page-lineBegining"] || "";
            cellContent = pageLineCellHtml(
              pl,
              token.ファイル名,
              token.開始文字位置
            );
            break;
          }
          case "伝本名":
            cellContent = escapeHtml(
              metadata.speaker_name ||
                (getActiveDataSourceType() === "upload" ? token.伝本名 : "") ||
                ""
            );
            break;
          case "職業":
            cellContent = escapeHtml(metadata.speaker_occupation || "");
            break;
          case "対校表番号":
            cellContent = escapeHtml(token.対校表番号 || "");
            break;
          case "permalink":
            if (metadata.url) {
              cellContent = `<a href="${escapeHtml(
                metadata.url
              )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                metadata.url
              )}</a>`;
            } else {
              cellContent = "";
            }
            break;
          default:
            cellContent = "";
        }
      }
      td.innerHTML = isValidValue(cellContent) ? cellContent : "";

      if (internalKey === "開始文字位置") {
        td.addEventListener("click", (e) => {
          e.preventDefault();
          showModalMetadataTable(
            tokenId,
            "position",
            allTokens,
            contextSeparatorText,
            actualContextSize,
            tokenId,
            tokenId,
            false
          );
        });
      }

      tr.appendChild(td);
    });
    fragment.appendChild(tr);

    if (showOriginalTextRow) {
      const originalContextInfo = getOriginalTextContextTokens(
        tokenId,
        allTokens,
        contextSeparatorText,
        actualContextSize,
        highlightForThisRow
      );

      const secondRow = document.createElement("tr");

      const preTd = document.createElement("td");
      preTd.dataset.internalKey = "原文前文脈";
      preTd.classList.add("context-cell");
      preTd.innerHTML = originalContextInfo.preContextText;
      secondRow.appendChild(preTd);

      const originalTd = document.createElement("td");
      originalTd.dataset.internalKey = "原文文字列";
      originalTd.innerHTML = escapeHtml(token.原文文字列 || "");
      secondRow.appendChild(originalTd);

      const postTd = document.createElement("td");
      postTd.dataset.internalKey = "原文後文脈";
      postTd.classList.add("context-cell");
      postTd.innerHTML = originalContextInfo.postContextText;
      secondRow.appendChild(postTd);

      fragment.appendChild(secondRow);
    }
  });
  tableBody.appendChild(fragment);

  if (typeof setupContextTooltips === "function" && allTokens) {
    setupContextTooltips(
      tableBody,
      allTokens,
      contextSeparatorText,
      actualContextSize,
      false
    );
  } else if (!allTokens) {
    console.warn(
      "[displayTableResults] allTokens is not available, skipping tooltip setup."
    );
  } else {
    console.warn(
      "[displayTableResults] setupContextTooltips function is not defined globally or not imported."
    );
  }
}

function displayStringTableResults(
  pageResults,
  columnsToDisplay,
  allTokens,
  contextSeparatorText,
  actualContextSize
) {
  const tableBody = document.getElementById("string-results-table-body");
  if (!tableBody) {
    console.error(
      "[displayStringTableResults] Table body #string-results-table-body not found."
    );
    return;
  }

  const table = tableBody.closest("table");
  const originalDisplay = table ? table.style.display : "";
  if (table) table.style.display = "none";

  tableBody.innerHTML = "";

  if (pageResults.length === 0) {
    if (table) table.style.display = originalDisplay;
    return;
  }

  const fragment = document.createDocumentFragment();
  const rows = [];

  pageResults.forEach((result) => {
    const tr = document.createElement("tr");
    const token = result.token;
    if (token) {
      tr.dataset.tokenId =
        result.lastTokenId !== undefined
          ? result.lastTokenId
          : token.tokenId !== undefined
          ? token.tokenId
          : result.firstTokenId;
    }
    tr.dataset.firstTokenId = result.firstTokenId;
    tr.dataset.lastTokenId = result.lastTokenId;
    tr.dataset.matchedString = result.matchedText || "";

    const metadata = result.metadata;
    const keyTextForDisplay = result.keyTextForDisplay;
    const preContextText = result.context?.preContextText || "";
    const postContextText = result.context?.postContextText || "";
    const cellsData = [];

    const showOriginalTextRow =
      columnsToDisplay.includes("原文文字列") &&
      columnsToDisplay.includes("キー");

    const originalTokenId =
      result.lastTokenId !== undefined
        ? result.lastTokenId
        : token?.tokenId !== undefined
        ? token.tokenId
        : result.firstTokenId;
    const originalContextInfo = showOriginalTextRow
      ? getOriginalTextContextTokens(
          originalTokenId,
          allTokens,
          contextSeparatorText,
          actualContextSize,
          {
            pre: new Set(result.preHighlightIds || []),
            post: new Set(result.postHighlightIds || []),
          }
        )
      : null;

    columnsToDisplay.forEach((internalKey) => {
      if (internalKey === "原文文字列" && showOriginalTextRow) {
        return;
      }

      const cellData = {
        internalKey: internalKey,
        content: "",
        className: "",
        rowSpan: null,
        clickHandler: null,
      };

      if (!["前文脈", "キー", "後文脈"].includes(internalKey)) {
        cellData.rowSpan = showOriginalTextRow ? 2 : 1;
      }

      if (token) {
        switch (internalKey) {
          case "ファイル名":
            cellData.content = escapeHtml(token.ファイル名 || "");
            break;
          case "開始文字位置":
            cellData.content = `<a href="javascript:void(0)">${escapeHtml(
              String(token.開始文字位置 ?? "")
            )}</a>`;
            break;
          case "終了文字位置":
            cellData.content = escapeHtml(token.終了文字位置 || "");
            break;
          case "文境界":
            cellData.content = escapeHtml(token.文境界 || "");
            break;
          case "前文脈":
            cellData.content = preContextText;
            cellData.className = "context-cell";
            break;
          case "キー":
            cellData.content = keyTextForDisplay;
            break;
          case "後文脈":
            cellData.content = postContextText;
            cellData.className = "context-cell";
            break;
          case "語彙素":
            cellData.content = escapeHtml(token.語彙素 || "");
            break;
          case "語彙素読み":
            cellData.content = escapeHtml(token.語彙素読み || "");
            break;
          case "品詞":
            cellData.content = escapeHtml(token.品詞 || "");
            break;
          case "活用型":
            cellData.content = escapeHtml(token.活用型 || "");
            break;
          case "活用形":
            cellData.content = escapeHtml(token.活用形 || "");
            break;
          case "発音形出現形":
            cellData.content = escapeHtml(token.発音形出現形 || "");
            break;
          case "語種":
            cellData.content = escapeHtml(token.語種 || "");
            break;
          case "原文文字列":
            cellData.content = escapeHtml(token.原文文字列 || "");
            break;
          case "巻名":
            const volumeValue =
              getActiveDataSourceType() === "upload"
                ? token.巻名
                : metadata.recording_volume || token.巻名;
            cellData.content = escapeHtml(String(volumeValue ?? ""));
            break;
          case "話者数":
            cellData.content = escapeHtml(String(metadata.speaker_count ?? ""));
            break;
          case "話者ID":
            cellData.content = escapeHtml(
              metadata.speaker_id ||
                (getActiveDataSourceType() === "upload" ? token.話者ID : "") ||
                ""
            );
            break;
          case "年齢":
            cellData.content = escapeHtml(String(metadata.speaker_age ?? ""));
            break;
          case "page-lineBegining": {
            const pl = token["page-lineBegining"] || "";
            cellData.content = pageLineCellHtml(
              pl,
              token.ファイル名,
              token.開始文字位置
            );
            break;
          }
          case "伝本名":
            cellData.content = escapeHtml(
              metadata.speaker_name ||
                (getActiveDataSourceType() === "upload" ? token.伝本名 : "") ||
                ""
            );
            break;
          case "職業":
            cellData.content = escapeHtml(metadata.speaker_occupation || "");
            break;
          case "対校表番号":
            cellData.content = escapeHtml(token.対校表番号 || "");
            break;
          case "permalink":
            if (metadata.url) {
              cellData.content = `<a href="${escapeHtml(
                metadata.url
              )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                metadata.url
              )}</a>`;
            }
            break;
          default:
            cellData.content = "";
        }
      }
      cellsData.push(cellData);
    });

    cellsData.forEach((cellData) => {
      const td = document.createElement("td");
      td.dataset.internalKey = cellData.internalKey;
      if (cellData.className) {
        td.className = cellData.className;
      }
      if (cellData.rowSpan) {
        td.rowSpan = cellData.rowSpan;
      }
      td.innerHTML = isValidValue(cellData.content) ? cellData.content : "";

      if (cellData.clickHandler) {
        td.addEventListener("click", cellData.clickHandler);
      }

      if (cellData.internalKey === "開始文字位置") {
        td.addEventListener("click", (e) => {
          e.preventDefault();
          showModalMetadataTable(
            result.lastTokenId,
            "position",
            allTokens,
            contextSeparatorText,
            actualContextSize,
            result.firstTokenId,
            result.lastTokenId,
            true
          );
        });
      }
      tr.appendChild(td);
    });
    rows.push(tr);

    if (showOriginalTextRow) {
      const secondRow = document.createElement("tr");

      const preTd = document.createElement("td");
      preTd.dataset.internalKey = "原文前文脈";
      preTd.className = "context-cell";
      preTd.innerHTML = originalContextInfo?.preContextText || "";
      secondRow.appendChild(preTd);

      const originalTd = document.createElement("td");
      originalTd.dataset.internalKey = "原文文字列";
      originalTd.innerHTML = escapeHtml(token?.原文文字列 || "");
      secondRow.appendChild(originalTd);

      const postTd = document.createElement("td");
      postTd.dataset.internalKey = "原文後文脈";
      postTd.className = "context-cell";
      postTd.innerHTML = originalContextInfo?.postContextText || "";
      secondRow.appendChild(postTd);

      rows.push(secondRow);
    }
  });

  rows.forEach((row) => fragment.appendChild(row));
  tableBody.appendChild(fragment);

  if (table) table.style.display = originalDisplay;

  if (typeof setupContextTooltips === "function" && allTokens) {
    requestAnimationFrame(() => {
      setupContextTooltips(
        tableBody,
        allTokens,
        contextSeparatorText,
        actualContextSize,
        true
      );
    });
  }
}
