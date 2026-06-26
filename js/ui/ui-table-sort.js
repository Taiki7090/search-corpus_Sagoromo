import * as appState from "../store/app-state.js";
import { getContextTokens } from "./ui-context.js";

const sortState = {
  unit: {
    column: null,
    direction: "asc",
  },
  string: {
    column: null,
    direction: "asc",
  },
};

export function setupSortableHeaders(type, redrawCallback) {
  const tableId = type === "unit" ? "results-table" : "string-results-table";
  const tableHeader = document.querySelector(`#${tableId} thead`);

  if (!tableHeader) {
    console.warn(
      `[setupSortableHeaders] Header element (thead) not found for table #${tableId}`
    );
    return;
  }
  addSortHandlers(type, tableHeader, redrawCallback);
}

function sortTable(type, originalColumn, direction, redrawCallback) {
  const tableId = type === "unit" ? "results-table" : "string-results-table";
  const table = document.getElementById(tableId);
  if (table && table.style.tableLayout !== "fixed") {
    table.style.tableLayout = "fixed";
  }
  if (table) table.classList.add("sorting");

  let contextSize = 20;
  if (type === "unit") {
    const contextSizeSelect = document.getElementById("context-size");
    if (contextSizeSelect)
      contextSize = parseInt(contextSizeSelect.value, 10) || 20;
  } else if (type === "string") {
    const contextSizeSelect = document.getElementById("string-context-size");
    if (contextSizeSelect)
      contextSize = parseInt(contextSizeSelect.value, 10) || 20;
  }

  try {
    let itemsToSort = [];

    if (type === "unit") {
      if (
        !appState.getUnitSearchResultIds() ||
        appState.getUnitSearchResultIds().length === 0
      ) {
        if (table) {
          table.style.tableLayout = "auto";
          table.classList.remove("sorting");
        }
        return;
      }
      itemsToSort = appState.getUnitSearchResultIds().slice();
    } else if (type === "string") {
      if (
        !appState.getStringSearchResultObjects() ||
        appState.getStringSearchResultObjects().length === 0
      ) {
        if (table) {
          table.style.tableLayout = "auto";
          table.classList.remove("sorting");
        }
        return;
      }
      itemsToSort = appState.getStringSearchResultObjects().slice();
    } else {
      console.error(`[sortTable] Unknown sort type: ${type}`);
      if (table) {
        table.style.tableLayout = "auto";
        table.classList.remove("sorting");
      }
      return;
    }
    const currentCorpusData = appState.getCorpusData();
    itemsToSort.sort((itemA, itemB) => {
      let tokenA, tokenB, metadataA, metadataB;
      let keyTextA = "",
        keyTextB = "";

      if (type === "unit") {
        const tokenIdA = itemA.tokenId;
        const tokenIdB = itemB.tokenId;
        tokenA = currentCorpusData?.tokens?.[tokenIdA] || {};
        tokenB = currentCorpusData?.tokens?.[tokenIdB] || {};
        if (!tokenA || Object.keys(tokenA).length === 0)
          return direction === "asc" ? 1 : -1;
        if (!tokenB || Object.keys(tokenB).length === 0)
          return direction === "asc" ? -1 : 1;
        metadataA = currentCorpusData?.file_metadata?.[tokenA.ファイル名] || {};
        metadataB = currentCorpusData?.file_metadata?.[tokenB.ファイル名] || {};
      } else {
        tokenA = itemA?.token || {};
        tokenB = itemB?.token || {};
        if (!tokenA || Object.keys(tokenA).length === 0)
          return direction === "asc" ? 1 : -1;
        if (!tokenB || Object.keys(tokenB).length === 0)
          return direction === "asc" ? -1 : 1;
        metadataA = itemA?.metadata || {};
        metadataB = itemB?.metadata || {};
        keyTextA = itemA?.keyTextForDisplay || "";
        keyTextB = itemB?.keyTextForDisplay || "";
      }

      let valueA, valueB;
      const isUpload = appState.getActiveDataSourceType() === "upload";

      switch (originalColumn) {
        case "ファイル名":
          valueA = tokenA.ファイル名 || "";
          valueB = tokenB.ファイル名 || "";
          break;
        case "開始文字位置":
          valueA = parseInt(tokenA.開始文字位置 || "0", 10);
          valueB = parseInt(tokenB.開始文字位置 || "0", 10);
          return direction === "asc" ? valueA - valueB : valueB - valueA;
        case "終了文字位置":
          valueA = isUpload
            ? String(tokenA.終了文字位置 ?? "")
            : tokenA.終了文字位置 || "";
          valueB = isUpload
            ? String(tokenB.終了文字位置 ?? "")
            : tokenB.終了文字位置 || "";
          const numA_id = parseInt(valueA);
          const numB_id = parseInt(valueB);
          if (!isNaN(numA_id) && !isNaN(numB_id))
            return direction === "asc" ? numA_id - numB_id : numB_id - numA_id;
          break;

        case "前文脈":
          if (type === "string") {
            valueA = itemA?.context?.preContextText || "";
            valueB = itemB?.context?.preContextText || "";
          } else {
            const allTokens = currentCorpusData?.tokens || [];
            const separatorElement =
              document.getElementById("context-separator");
            const contextSeparatorText = separatorElement
              ? separatorElement.value === "none"
                ? ""
                : separatorElement.value
              : "|";
            const contextA =
              typeof getContextTokens === "function"
                ? getContextTokens(
                    itemA.tokenId,
                    allTokens,
                    contextSeparatorText,
                    contextSize,
                    {
                      pre: new Set(),
                      post: new Set(),
                    }
                  )
                : { preContextText: "" };
            const contextB =
              typeof getContextTokens === "function"
                ? getContextTokens(
                    itemB.tokenId,
                    allTokens,
                    contextSeparatorText,
                    contextSize,
                    {
                      pre: new Set(),
                      post: new Set(),
                    }
                  )
                : { preContextText: "" };
            valueA = contextA.preContextText || "";
            valueB = contextB.preContextText || "";
          }
          break;

        case "キー":
          valueA = type === "string" ? keyTextA : tokenA.書字形出現形 || "";
          valueB = type === "string" ? keyTextB : tokenB.書字形出現形 || "";
          break;

        case "後文脈":
          if (type === "string") {
            valueA = itemA?.context?.postContextText || "";
            valueB = itemB?.context?.postContextText || "";
          } else {
            const allTokens = currentCorpusData?.tokens || [];
            const separatorElement =
              document.getElementById("context-separator");
            const contextSeparatorText = separatorElement
              ? separatorElement.value === "none"
                ? ""
                : separatorElement.value
              : "|";
            const contextA =
              typeof getContextTokens === "function"
                ? getContextTokens(
                    itemA.tokenId,
                    allTokens,
                    contextSeparatorText,
                    contextSize,
                    {
                      pre: new Set(),
                      post: new Set(),
                    }
                  )
                : { postContextText: "" };
            const contextB =
              typeof getContextTokens === "function"
                ? getContextTokens(
                    itemB.tokenId,
                    allTokens,
                    contextSeparatorText,
                    contextSize,
                    {
                      pre: new Set(),
                      post: new Set(),
                    }
                  )
                : { postContextText: "" };
            valueA = contextA.postContextText || "";
            valueB = contextB.postContextText || "";
          }
          break;

        case "巻名":
          valueA =
            (isUpload ? tokenA.巻名 : metadataA?.recording_volume) || "";
          valueB =
            (isUpload ? tokenB.巻名 : metadataB?.recording_volume) || "";
          return direction === "asc"
            ? valueA.localeCompare(valueB, "ja")
            : valueB.localeCompare(valueA, "ja");

        case "伝本名":
          valueA = (isUpload ? tokenA.伝本名 : metadataA?.speaker_name) || "";
          valueB = (isUpload ? tokenB.伝本名 : metadataB?.speaker_name) || "";
          break;
        case "語彙素":
          valueA = tokenA.語彙素 || "";
          valueB = tokenB.語彙素 || "";
          break;
        case "品詞":
          valueA = tokenA.品詞 || "";
          valueB = tokenB.品詞 || "";
          break;
        case "活用型":
          valueA = tokenA.活用型 || "";
          valueB = tokenB.活用型 || "";
          break;
        case "活用形":
          valueA = tokenA.活用形 || "";
          valueB = tokenB.活用形 || "";
          break;
        case "書字形出現形":
          valueA = tokenA.書字形出現形 || "";
          valueB = tokenB.書字形出現形 || "";
          break;
        case "発音形出現形":
          valueA = tokenA.発音形出現形 || "";
          valueB = tokenB.発音形出現形 || "";
          break;
        case "語種":
          valueA = tokenA.語種 || "";
          valueB = tokenB.語種 || "";
          break;
        case "話者数":
          valueA = metadataA?.speaker_count ?? -Infinity;
          valueB = metadataB?.speaker_count ?? -Infinity;
          const numA_sc = parseFloat(valueA);
          const numB_sc = parseFloat(valueB);
          if (!isNaN(numA_sc) && !isNaN(numB_sc))
            return direction === "asc" ? numA_sc - numB_sc : numB_sc - numA_sc;
          valueA = String(valueA === -Infinity ? "" : valueA);
          valueB = String(valueB === -Infinity ? "" : valueB);
          break;
        case "話者ID":
          valueA = metadataA?.speaker_id || "";
          valueB = metadataB?.speaker_id || "";
          break;
        case "年齢":
          valueA = metadataA?.speaker_age ?? -Infinity;
          valueB = metadataB?.speaker_age ?? -Infinity;
          const numA_age = parseFloat(valueA);
          const numB_age = parseFloat(valueB);
          if (!isNaN(numA_age) && !isNaN(numB_age))
            return direction === "asc"
              ? numA_age - numB_age
              : numB_age - numA_age;
          valueA = String(valueA === -Infinity ? "" : valueA);
          valueB = String(valueB === -Infinity ? "" : valueB);
          break;
        case "page-lineBegining":
          valueA = tokenA["page-lineBegining"] || "";
          valueB = tokenB["page-lineBegining"] || "";
          break;
        case "職業":
          valueA = metadataA?.speaker_occupation || "";
          valueB = metadataB?.speaker_occupation || "";
          break;
        case "permalink":
          valueA = metadataA?.url || "";
          valueB = metadataB?.url || "";
          break;
        default:
          valueA = "";
          valueB = "";
      }

      const strA = String(valueA);
      const strB = String(valueB);
      if (strA === "" && strB !== "") return direction === "asc" ? 1 : -1;
      if (strA !== "" && strB === "") return direction === "asc" ? -1 : 1;
      if (strA === "" && strB === "") return 0;
      const comparison = strA.localeCompare(strB, "ja", {
        numeric: true,
        sensitivity: "base",
      });
      return direction === "asc" ? comparison : -comparison;
    });

    if (type === "unit") {
      appState.setUnitSearchResultIds(itemsToSort);
    } else {
      appState.setStringSearchResultObjects(itemsToSort);
    }

    requestAnimationFrame(() => {
      let currentPageToDisplay;
      let resultsPerPageToDisplay;

      if (type === "unit") {
        currentPageToDisplay = appState.getUnitCurrentPage() || 1;
        resultsPerPageToDisplay = appState.getUnitResultsPerPage() || 20;
      } else {
        currentPageToDisplay = appState.getStringCurrentPage() || 1;
        resultsPerPageToDisplay = appState.getStringResultsPerPage() || 20;
      }

      if (redrawCallback && typeof redrawCallback === "function") {
        redrawCallback(currentPageToDisplay, resultsPerPageToDisplay);
      } else {
        console.error(
          `[sortTable] redrawCallback is not a function for type: ${type}`
        );
      }

      if (table) {
        setTimeout(() => {
          table.style.tableLayout = "auto";
          table.classList.remove("sorting");
        }, 50);
      }
    });
  } catch (error) {
    console.error(
      `[sortTable] Error during sorting (type: ${type}, column: ${originalColumn}):`,
      error
    );
    if (table) {
      table.style.tableLayout = "auto";
      table.classList.remove("sorting");
    }
  }
}

function addSortHandlers(type, tableHeader, redrawCallback) {
  const headers = tableHeader.querySelectorAll("tr th");

  if (headers.length === 0) {
    return;
  }

  headers.forEach((header) => {
    const originalColumnName = header.dataset.originalColumn;
    const displayedColumnName = header.textContent.trim();

    if (!originalColumnName) {
      console.warn(
        `[addSortHandlers] Could not get original column name from data attribute for header: "${displayedColumnName}". Skipping sort handler.`
      );
      header.classList.remove("sortable", "sort-asc", "sort-desc");
      header.style.cursor = "default";
      if (header.sortClickListener) {
        header.removeEventListener("click", header.sortClickListener);
        delete header.sortClickListener;
      }
      return;
    }

    header.style.cursor = "pointer";
    if (!header.classList.contains("sortable")) {
      header.classList.add("sortable");
    }

    if (header.sortClickListener) {
      header.removeEventListener("click", header.sortClickListener);
    }

    const clickListener = function () {
      const currentSortColumn = sortState[type].column;
      const currentSortDirection = sortState[type].direction;

      if (currentSortColumn === originalColumnName) {
        sortState[type].direction =
          currentSortDirection === "asc" ? "desc" : "asc";
      } else {
        sortState[type].column = originalColumnName;
        sortState[type].direction = "asc";
      }

      headers.forEach((h) => {
        h.classList.remove("sort-asc", "sort-desc");
      });
      this.classList.add(
        sortState[type].direction === "asc" ? "sort-asc" : "sort-desc"
      );

      setTimeout(() => {
        sortTable(
          type,
          sortState[type].column,
          sortState[type].direction,
          redrawCallback
        );
      }, 10);
    };

    header.sortClickListener = clickListener;
    header.addEventListener("click", clickListener);

    header.classList.remove("sort-asc", "sort-desc");
    if (sortState[type].column === originalColumnName) {
      header.classList.add(
        sortState[type].direction === "asc" ? "sort-asc" : "sort-desc"
      );
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const observerCallback = (mutationsList, _observer) => {
    for (const mutation of mutationsList) {
      if (
        mutation.type === "childList" &&
        mutation.target.nodeName === "THEAD"
      ) {
        const tableId = mutation.target.closest("table")?.id;
        if (tableId === "results-table") {
        } else if (tableId === "string-results-table") {
        }
        break;
      }
    }
  };

  const observerOptions = {
    childList: true,
    subtree: true,
  };

  const unitThead = document.querySelector("#results-table thead");
  const stringThead = document.querySelector("#string-results-table thead");

  if (unitThead) {
    const unitObserver = new MutationObserver(observerCallback);
    unitObserver.observe(unitThead, observerOptions);
  } else {
    console.warn("[table-sort.js] Unit table thead not found for observer.");
  }

  if (stringThead) {
    const stringObserver = new MutationObserver(observerCallback);
    stringObserver.observe(stringThead, observerOptions);
  } else {
    console.warn("[table-sort.js] String table thead not found for observer.");
  }
});
