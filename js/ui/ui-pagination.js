import * as appState from "../store/app-state.js";
import { calculateFilteredStats } from "../utils/stats-utils.js";
import { updateUnitSearchStats, updateStringSearchStats } from "./ui-stats.js";

export function createPagination(
  type,
  totalHits,
  totalPages,
  currentPageValue,
  resultsPerPageValue,
  displayPageFunc
) {
  const paginationId = type === "unit" ? "pagination" : "string-pagination";
  const paginationContainer = document.getElementById(paginationId);

  if (!paginationContainer) {
    console.error(`Pagination container #${paginationId} not found.`);
    return;
  }
  if (
    typeof totalHits !== "number" ||
    isNaN(totalHits) ||
    totalHits < 0 ||
    typeof totalPages !== "number" ||
    isNaN(totalPages) ||
    totalPages < 0 ||
    typeof currentPageValue !== "number" ||
    isNaN(currentPageValue) ||
    currentPageValue < 1 ||
    typeof resultsPerPageValue !== "number" ||
    isNaN(resultsPerPageValue) ||
    resultsPerPageValue <= 0
  ) {
    console.error(
      `[Pagination] Invalid arguments: hits=${totalHits}, pages=${totalPages}, current=${currentPageValue}, perPage=${resultsPerPageValue}`
    );
    paginationContainer.innerHTML = "";
    paginationContainer.style.display = "none";
    return;
  }

  paginationContainer.innerHTML = "";
  paginationContainer.className = "pagination-container";
  if (totalHits === 0) {
    paginationContainer.style.display = "none";
    return;
  } else {
    paginationContainer.style.display = "flex";
  }

  const updateGlobalPage = (page) => {
    if (type === "unit") {
      appState.setUnitCurrentPage(page);
    } else if (type === "string") {
      appState.setStringCurrentPage(page);
    } else {
      console.warn(`[Pagination Update] Unknown pagination type: ${type}`);
    }
  };

  const updateStats = (newPage) => {
    const statsFunc =
      type === "unit" ? updateUnitSearchStats : updateStringSearchStats;

    let currentResultsPerPage;
    let currentTotalHits = 0;
    let currentResultIdsOrObjects = [];
    let uniqueFiles = new Set();
    const currentCorpusData = appState.getCorpusData();

    if (type === "unit") {
      currentResultsPerPage = appState.getUnitResultsPerPage() || 20;
      currentTotalHits = appState.getUnitTotalHits() || 0;
      currentResultIdsOrObjects = appState.getUnitSearchResultIds() || [];
      if (
        currentCorpusData?.tokens &&
        Array.isArray(currentResultIdsOrObjects)
      ) {
        currentResultIdsOrObjects.forEach((item) => {
          const tokenId = item.tokenId;
          const token = currentCorpusData.tokens[tokenId];
          if (token?.ファイル名) uniqueFiles.add(token.ファイル名);
        });
      }
    } else {
      currentResultsPerPage = appState.getStringResultsPerPage() || 20;
      currentTotalHits = appState.getStringTotalHits() || 0;
      currentResultIdsOrObjects = appState.getStringSearchResultObjects() || [];
      if (
        currentCorpusData?.tokens &&
        Array.isArray(currentResultIdsOrObjects)
      ) {
        currentResultIdsOrObjects.forEach((result) => {
          if (result?.token?.ファイル名)
            uniqueFiles.add(result.token.ファイル名);
        });
      }
    }

    if (
      typeof statsFunc === "function" &&
      typeof calculateFilteredStats === "function"
    ) {
      try {
        const currentStatsData =
          appState.getActiveDataSourceType() === "upload"
            ? appState.getUploadedStatsData()
            : appState.getStatsData();
        const filteredStats = calculateFilteredStats(currentStatsData);

        statsFunc(
          currentTotalHits,
          filteredStats,
          uniqueFiles.size,
          newPage,
          currentResultsPerPage
        );
      } catch (e) {
        console.error(`Error updating stats for type ${type}:`, e);
      }
    } else {
      console.warn(
        `Stats update function or calculateFilteredStats not found for type ${type}.`
      );
    }
  };

  const scrollToTop = () => {
    const statsId =
      type === "unit" ? "unit-result-stats" : "string-result-stats";
    const statsElement = document.getElementById(statsId);
    if (statsElement) {
      statsElement.scrollIntoView({ behavior: "auto", block: "start" });
    } else {
      scrollTo({ top: 0, behavior: "auto" });
    }
  };

  const pageInfo = document.createElement("div");
  pageInfo.className = "pagination-info";
  const displayTotalPages = Math.max(totalPages, 0);
  const displayCurrentPage =
    totalHits > 0 && displayTotalPages > 0
      ? Math.min(currentPageValue, displayTotalPages)
      : displayTotalPages >= 1
      ? 1
      : 0;
  pageInfo.textContent = `${displayCurrentPage} / ${displayTotalPages} ページ`;
  paginationContainer.appendChild(pageInfo);

  const pageLinksContainer = document.createElement("div");
  pageLinksContainer.className = "pagination-links";

  function createPageLink(pageNumber, text = null) {
    const link = document.createElement("a");
    link.className = "page-link";
    link.href = "javascript:void(0);";
    link.textContent = text !== null ? text : String(pageNumber);
    link.dataset.page = String(pageNumber);

    const isNotClickable = pageNumber === currentPageValue || totalPages <= 1;

    if (isNotClickable) {
      link.classList.add(
        pageNumber === currentPageValue ? "active" : "disabled"
      );
      link.removeAttribute("href");
      link.style.cursor = "default";
    } else {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const newPage = parseInt(e.target.dataset.page, 10);
        if (isNaN(newPage)) return;

        let currentResultsPerPageOnClick;
        let currentTotalHitsOnClick;
        let currentTotalPagesOnClick;

        if (type === "unit") {
          currentResultsPerPageOnClick = appState.getUnitResultsPerPage() || 20;
          currentTotalHitsOnClick = appState.getUnitTotalHits() || 0;
          currentTotalPagesOnClick =
            currentTotalHitsOnClick > 0
              ? Math.ceil(
                  currentTotalHitsOnClick / currentResultsPerPageOnClick
                ) || 1
              : 0;
        } else {
          currentResultsPerPageOnClick =
            appState.getStringResultsPerPage() || 20;
          currentTotalHitsOnClick = appState.getStringTotalHits() || 0;
          currentTotalPagesOnClick =
            currentTotalHitsOnClick > 0
              ? Math.ceil(
                  currentTotalHitsOnClick / currentResultsPerPageOnClick
                ) || 1
              : 0;
        }

        updateGlobalPage(newPage);

        if (typeof displayPageFunc === "function") {
          displayPageFunc(newPage, currentResultsPerPageOnClick);
        } else {
          console.error(
            `[Pagination Callback] displayPageFunc for type ${type} is not a function. Received:`,
            displayPageFunc
          );
        }

        createPagination(
          type,
          currentTotalHitsOnClick,
          currentTotalPagesOnClick,
          newPage,
          currentResultsPerPageOnClick,
          displayPageFunc
        );
        updateStats(newPage);
        scrollToTop();
      });
    }
    return link;
  }

  function createEllipsis() {
    const span = document.createElement("span");
    span.className = "pagination-ellipsis";
    span.textContent = "...";
    return span;
  }

  function createDisabledArrow(text) {
    const span = document.createElement("span");
    span.className = "page-link disabled";
    span.textContent = text;
    return span;
  }

  const maxVisiblePagesAroundCurrent = 5;
  const sidePages = Math.floor(maxVisiblePagesAroundCurrent / 2);

  if (totalPages > 1) {
    if (currentPageValue > 1) {
      pageLinksContainer.appendChild(createPageLink(currentPageValue - 1, "<"));
    } else {
      pageLinksContainer.appendChild(createDisabledArrow("<"));
    }
  }

  if (totalPages > 0) {
    if (totalPages <= maxVisiblePagesAroundCurrent + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pageLinksContainer.appendChild(createPageLink(i));
      }
    } else {
      let showFirstEllipsis = false;
      let showLastEllipsis = false;
      let startPage = Math.max(2, currentPageValue - sidePages);
      let endPage = Math.min(totalPages - 1, currentPageValue + sidePages);

      if (currentPageValue - sidePages <= 2) {
        endPage = Math.min(totalPages - 1, 1 + maxVisiblePagesAroundCurrent);
      }
      if (currentPageValue + sidePages >= totalPages - 1) {
        startPage = Math.max(2, totalPages - maxVisiblePagesAroundCurrent);
      }

      if (startPage > 2) showFirstEllipsis = true;
      if (endPage < totalPages - 1) showLastEllipsis = true;

      pageLinksContainer.appendChild(createPageLink(1));
      if (showFirstEllipsis) pageLinksContainer.appendChild(createEllipsis());
      for (let i = startPage; i <= endPage; i++)
        pageLinksContainer.appendChild(createPageLink(i));
      if (showLastEllipsis) pageLinksContainer.appendChild(createEllipsis());
      pageLinksContainer.appendChild(createPageLink(totalPages));
    }
  }

  if (totalPages > 1) {
    if (currentPageValue < totalPages) {
      pageLinksContainer.appendChild(createPageLink(currentPageValue + 1, ">"));
    } else {
      pageLinksContainer.appendChild(createDisabledArrow(">"));
    }
  }

  paginationContainer.appendChild(pageLinksContainer);

  const scrollTopButton = document.createElement("button");
  scrollTopButton.textContent = "∧";
  scrollTopButton.className = "pagination-scroll-top";
  scrollTopButton.type = "button";
  scrollTopButton.addEventListener("click", () => scrollToTop());
  paginationContainer.appendChild(scrollTopButton);
}
