import {
  getActiveDataSourceType,
  getStatsData,
  getUploadedStatsData,
} from "../store/app-state.js";
import { buildSearchConditionsText } from "../ui/ui-search-display-utils.js";
import { setupCopyButton } from "./ui-utils.js";

export function updateUnitSearchStats(
  resultCount,
  filteredStats,
  uniqueFileCount,
  pageNum = 1,
  itemsPerPage = 20
) {
  const unitResultStats = document.getElementById("unit-result-stats");
  if (unitResultStats) {
    const start = resultCount > 0 ? (pageNum - 1) * itemsPerPage + 1 : 0;
    const end =
      resultCount > 0 ? Math.min(start + itemsPerPage - 1, resultCount) : 0;

    const numResultCount = Number(resultCount) || 0;
    const numStart = Number(start) || 0;
    const numEnd = Number(end) || 0;
    const numTotalTokens = Number(filteredStats?.total_tokens) || 0;
    const numFilteredTokens = Number(filteredStats?.filtered_tokens) || 0;
    const numUniqueFileCount = Number(uniqueFileCount) || 0;

    const formattedResultCount = numResultCount.toLocaleString();
    const formattedStart = numStart.toLocaleString();
    const formattedEnd = numEnd.toLocaleString();
    const formattedTotalTokens = numTotalTokens.toLocaleString();
    const formattedFilteredTokens = numFilteredTokens.toLocaleString();
    const formattedUniqueFileCount = numUniqueFileCount.toLocaleString();

    let totalSampleCount = 0;
    const currentActiveDataSource = getActiveDataSourceType();
    const currentStats =
      currentActiveDataSource === "upload"
        ? getUploadedStatsData()
        : getStatsData();
    if (currentStats) totalSampleCount = currentStats.file_count || 0;
    const formattedTotalSampleCount = Number(totalSampleCount).toLocaleString();

    const rangeText =
      numResultCount > 0 ? `${formattedStart}-${formattedEnd}` : "0";

    const conditionsText =
      typeof buildSearchConditionsText === "function"
        ? buildSearchConditionsText()
        : "N/A";
    const conditionsContainerExisting = unitResultStats.querySelector(
      ".search-conditions-container"
    );
    const isOpen = conditionsContainerExisting
      ? conditionsContainerExisting.classList.contains("open")
      : false;

    unitResultStats.innerHTML = `
          <div class="search-conditions-container ${
            isOpen ? "open" : "closed"
          }">
            <div class="search-conditions-title">検索条件</div>
            <div class="search-conditions-display">${conditionsText}</div>
            <button class="toggle-conditions-button">${
              isOpen ? "▲" : "▼"
            }</button>
          </div>
          検索結果<span class="stats-highlight">${formattedResultCount}</span>件 (${rangeText}件を表示)<br>
          検索対象語数：<span class="stats-highlight">${formattedTotalTokens}</span>　
          記号・補助記号・空白を除いた検索対象語数：<span class="stats-highlight">${formattedFilteredTokens}</span>　
          検索対象サンプル数：<span class="stats-highlight">${formattedTotalSampleCount}</span>　(${formattedUniqueFileCount}ファイルで該当)
        `;

    const conditionsContainerNew = unitResultStats.querySelector(
      ".search-conditions-container"
    );
    if (conditionsContainerNew && typeof setupCopyButton === "function") {
      setupCopyButton(conditionsContainerNew);
    }
  } else {
    console.warn("Element 'unit-result-stats' not found.");
  }
}

export function updateStringSearchStats(
  resultCount,
  filteredStats,
  uniqueFileCount,
  pageNum = 1,
  itemsPerPage = 20
) {
  const stringResultStats = document.getElementById("string-result-stats");
  if (stringResultStats) {
    const start = resultCount > 0 ? (pageNum - 1) * itemsPerPage + 1 : 0;
    const end =
      resultCount > 0 ? Math.min(start + itemsPerPage - 1, resultCount) : 0;

    const numResultCount = Number(resultCount) || 0;
    const numStart = Number(start) || 0;
    const numEnd = Number(end) || 0;
    const numTotalTokens = Number(filteredStats?.total_tokens) || 0;
    const numFilteredTokens = Number(filteredStats?.filtered_tokens) || 0;
    const numUniqueFileCount = Number(uniqueFileCount) || 0;

    const formattedResultCount = numResultCount.toLocaleString();
    const formattedStart = numStart.toLocaleString();
    const formattedEnd = numEnd.toLocaleString();
    const formattedTotalTokens = numTotalTokens.toLocaleString();
    const formattedFilteredTokens = numFilteredTokens.toLocaleString();
    const formattedUniqueFileCount = numUniqueFileCount.toLocaleString();

    let totalSampleCount = 0;
    const currentActiveDataSource = getActiveDataSourceType();
    const currentStats =
      currentActiveDataSource === "upload"
        ? getUploadedStatsData()
        : getStatsData();
    if (currentStats) totalSampleCount = currentStats.file_count || 0;
    const formattedTotalSampleCount = Number(totalSampleCount).toLocaleString();

    const rangeText =
      numResultCount > 0 ? `${formattedStart}-${formattedEnd}` : "0";

    stringResultStats.innerHTML = `
          検索結果<strong style="color: #4b4484;">${formattedResultCount}</strong>件 (${rangeText}件を表示)<br>
          検索対象語数：<strong style="color: #4b4484;">${formattedTotalTokens}</strong>　
          記号・補助記号・空白を除いた検索対象語数：<strong style="color: #4b4484;">${formattedFilteredTokens}</strong>　
          検索対象サンプル数：<strong style="color: #4b4484;">${formattedTotalSampleCount}</strong>　(${formattedUniqueFileCount}ファイルで該当)
        `;
  } else {
    console.warn("Element 'string-result-stats' not found.");
  }
}
