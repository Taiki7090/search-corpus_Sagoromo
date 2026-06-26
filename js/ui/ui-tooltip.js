import * as appState from "../store/app-state.js";
import { isValidValue } from "./ui-utils.js";
let tooltipElement = null;
let tooltipTimer = null;

export function initializeTooltip() {
  if (!tooltipElement) {
    tooltipElement = document.createElement("div");
    tooltipElement.id = "context-tooltip";
    tooltipElement.className = "tooltip";
    document.body.appendChild(tooltipElement);
  }
}

export function setupContextTooltips(tableBodyParam) {
  let tableBody;
  if (typeof tableBodyParam === "string") {
    tableBody = document.getElementById(tableBodyParam + "-body");
    if (!tableBody) {
      console.warn(
        `Table body #${tableBodyParam}-body not found for tooltips.`
      );
      return;
    }
  } else if (tableBodyParam instanceof HTMLElement) {
    tableBody = tableBodyParam;
  } else {
    console.warn(
      `Invalid parameter type for setupContextTooltips. Expected string ID or HTMLElement.`
    );
    return;
  }

  tableBody.addEventListener("mouseover", (event) => {
    const targetWordSpan = event.target.closest(".context-word");

    if (targetWordSpan && targetWordSpan.dataset.tokenId) {
      const tokenId = parseInt(targetWordSpan.dataset.tokenId, 10);
      const currentCorpusData = appState.getCorpusData();
      if (!isNaN(tokenId) && currentCorpusData?.tokens?.[tokenId]) {
        const token = currentCorpusData.tokens[tokenId];

        const surface = isValidValue(token.書字形出現形)
          ? token.書字形出現形
          : "";
        const lemma = isValidValue(token.語彙素) ? token.語彙素 : "";
        const pos = isValidValue(token.品詞) ? token.品詞 : "";
        const conjType = isValidValue(token.活用型) ? token.活用型 : "";
        const conjForm = isValidValue(token.活用形) ? token.活用形 : "";
        const pronunciation = isValidValue(token.発音形出現形) ? token.発音形出現形 : "";
        const wordOrigin = isValidValue(token.語種) ? token.語種 : "";
        const tooltipContent = `
            <div class="tooltip-item"><strong>書字形:</strong> ${surface}</div>
            <div class="tooltip-item"><strong>語彙素:</strong> ${lemma}</div>
            <div class="tooltip-item"><strong>品詞:</strong> ${pos}</div>
            <div class="tooltip-item"><strong>活用型:</strong> ${conjType}</div>
            <div class="tooltip-item"><strong>活用形:</strong> ${conjForm}</div>
            <div class="tooltip-item"><strong>発音形出現形:</strong> ${pronunciation}</div>
            <div class="tooltip-item"><strong>語種:</strong> ${wordOrigin}</div>
          `;

        clearTimeout(tooltipTimer);
        tooltipTimer = setTimeout(() => {
          showTooltip(event, tooltipContent);
        }, 300);
      } else {
        clearTimeout(tooltipTimer);
        hideTooltip();
      }
    } else if (!targetWordSpan) {
    }
  });

  tableBody.addEventListener("mouseout", (event) => {
    const relatedTargetIsTooltip = event.relatedTarget === tooltipElement;
    if (relatedTargetIsTooltip) return;

    const targetWordSpan = event.target.closest(".context-word");
    if (targetWordSpan || event.target === tableBody) {
      clearTimeout(tooltipTimer);
      tooltipTimer = null;
      hideTooltip();
    }
  });

  const tableContainer =
    tableBody.closest("#table-results") ||
    tableBody.closest("#string-table-results");
  if (tableContainer) {
    tableContainer.addEventListener("scroll", hideTooltip, { passive: true });
  }
  addEventListener("scroll", hideTooltip, { passive: true });
}

function showTooltip(event, content) {
  if (!tooltipElement) initializeTooltip();

  tooltipElement.innerHTML = content;
  tooltipElement.style.display = "block";

  const offsetX = 6;
  const offsetY = 25;
  let x = event.pageX + offsetX;
  let y = event.pageY + offsetY;

  if (x + tooltipElement.offsetWidth > innerWidth + scrollX) {
    x = innerWidth + scrollX - tooltipElement.offsetWidth - offsetX;
  }
  if (y + tooltipElement.offsetHeight > innerHeight + scrollY) {
    y = event.pageY - tooltipElement.offsetHeight - offsetY;
  }
  if (x < scrollX) {
    x = scrollX + offsetX;
  }
  if (y < scrollY) {
    y = scrollY + offsetY;
  }

  tooltipElement.style.left = `${x}px`;
  tooltipElement.style.top = `${y}px`;
}

function hideTooltip() {
  clearTimeout(tooltipTimer);
  tooltipTimer = null;
  if (tooltipElement) {
    tooltipElement.style.display = "none";
  }
}
