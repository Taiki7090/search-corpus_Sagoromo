// Adds a horizontal scrollbar above the results tables that stays in sync with
// the table container's own (bottom) scrollbar. This lets users scroll the wide
// results table horizontally without having to scroll all the way to the bottom.

/**
 * Attach a synced top scrollbar to a scrollable table container.
 * @param {string} containerId - id of the element with `overflow-x: auto`.
 */
function attachTopScrollbar(containerId) {
  const container = document.getElementById(containerId);
  if (!container || container.dataset.topScrollbarAttached === "true") {
    return;
  }
  container.dataset.topScrollbarAttached = "true";

  // Outer element provides the visible top scrollbar; inner element is a spacer
  // whose width matches the table so the scrollbar thumb is sized correctly.
  const topScroll = document.createElement("div");
  topScroll.className = "table-top-scroll";
  const spacer = document.createElement("div");
  spacer.className = "table-top-scroll-inner";
  topScroll.appendChild(spacer);

  container.parentNode.insertBefore(topScroll, container);

  const syncSpacerWidth = () => {
    const table = container.querySelector("table");
    const width = table ? table.scrollWidth : container.scrollWidth;
    spacer.style.width = width + "px";
    // Hide the top scrollbar when there is nothing to scroll.
    topScroll.style.display =
      container.scrollWidth > container.clientWidth ? "block" : "none";
  };

  // Two-way scroll synchronization (guard against feedback loops).
  let isSyncing = false;
  topScroll.addEventListener("scroll", () => {
    if (isSyncing) {
      isSyncing = false;
      return;
    }
    isSyncing = true;
    container.scrollLeft = topScroll.scrollLeft;
  });
  container.addEventListener("scroll", () => {
    if (isSyncing) {
      isSyncing = false;
      return;
    }
    isSyncing = true;
    topScroll.scrollLeft = container.scrollLeft;
  });

  // Keep the spacer width in sync when the table is re-rendered or resized.
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(syncSpacerWidth).observe(container);
  }
  if (typeof MutationObserver !== "undefined") {
    new MutationObserver(syncSpacerWidth).observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  }
  window.addEventListener("resize", syncSpacerWidth);

  syncSpacerWidth();
}

function initTableTopScrollbars() {
  attachTopScrollbar("table-results");
  attachTopScrollbar("string-table-results");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTableTopScrollbars);
} else {
  initTableTopScrollbars();
}
