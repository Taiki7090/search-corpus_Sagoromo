import * as appState from "../store/app-state.js";
import { isValidValue } from "./ui-utils.js";

export function showModalMetadataTable(
  tokenOrId,
  contextType,
  allTokens,
  contextSeparatorText,
  contextSize,
  firstTokenId = null,
  lastTokenId = null,
  isStringSearch = false
) {
  const currentCorpusData = appState.getCorpusData();
  if (!currentCorpusData?.tokens) {
    console.error("showModalMetadataTable: Corpus data error");
    return;
  }

  let tokenId;
  let token;

  if (typeof tokenOrId === "number") {
    tokenId = tokenOrId;
    token = currentCorpusData.tokens[tokenId];
  } else {
    token = tokenOrId;
    if (isStringSearch && lastTokenId !== null) {
      tokenId = lastTokenId;
    } else {
      tokenId = token.tokenId ?? firstTokenId ?? 0;
    }
  }

  if (!token) {
    console.error("showModalMetadataTable: Token not found for id:", tokenOrId);
    return;
  }

  let contextTokens;
  if (contextType === "position") {
    if (isStringSearch && firstTokenId !== null && lastTokenId !== null) {
      contextTokens = getContextTokensForRange(
        firstTokenId,
        lastTokenId,
        contextSize
      );
    } else {
      contextTokens = getContextTokensForMetadata(tokenId, contextSize);
    }
  } else {
    contextTokens = getContextTokensForMetadata(tokenId, contextSize);
  }

  const tableBody = document.getElementById("modal-metadata-tbody");
  if (!tableBody) {
    console.error("modal-metadata-tbody not found.");
    return;
  }
  tableBody.innerHTML = "";

  const title = document.getElementById("modal-metadata-title");
  if (title) {
    if (contextType === "position") {
      title.textContent = "詳細な文脈情報";
    } else if (contextType === "pre") {
      title.textContent = "前文脈の情報";
    } else if (contextType === "post") {
      title.textContent = "後文脈の情報";
    }
  }

  updateModalTableHeader();

  if (contextType === "position" || contextType === "pre") {
    contextTokens.preContextTokens.forEach((t) =>
      addTokenRowToMetadataTable(tableBody, t)
    );
  }

  if (contextType === "position") {
    if (isStringSearch && firstTokenId !== null && lastTokenId !== null) {
      for (let i = firstTokenId; i <= lastTokenId; i++) {
        const t = currentCorpusData.tokens[i];
        if (t) {
          addTokenRowToMetadataTable(tableBody, t, i === tokenId);
        }
      }
    } else {
      addTokenRowToMetadataTable(tableBody, token, true);
    }
  }

  if (contextType === "position" || contextType === "post") {
    contextTokens.postContextTokens.forEach((t) =>
      addTokenRowToMetadataTable(tableBody, t)
    );
  }

  document.getElementById("modal-metadata-overlay").style.display = "block";

  const container = document.getElementById("modal-metadata-container");
  // サブウィンドウ(フローティングパネル)形式で表示。
  // 背後を暗くするオーバーレイは従来どおり継承する。
  container.style.display = "flex";
  positionMetadataWindow(container);
  enableMetadataDragMove(container);

  const keyRow = tableBody.querySelector(".key-row");
  if (keyRow) {
    setTimeout(
      () => keyRow.scrollIntoView({ block: "center", behavior: "auto" }),
      100
    );
  }
}

export function closeModalMetadataTable() {
  const overlay = document.getElementById("modal-metadata-overlay");
  const container = document.getElementById("modal-metadata-container");
  if (overlay) overlay.style.display = "none";
  if (container) container.style.display = "none";
}

// サブウィンドウを画面中央に配置する(表示直後に呼ぶ)。
function positionMetadataWindow(container) {
  // 一旦表示してから実寸を取得し、中央へ。
  const rect = container.getBoundingClientRect();
  const left = Math.max(8, (window.innerWidth - rect.width) / 2);
  const top = Math.max(8, (window.innerHeight - rect.height) / 2);
  container.style.left = left + "px";
  container.style.top = top + "px";
}

// ヘッダをドラッグしてウィンドウを移動できるようにする(多重登録を防止)。
let metadataDragBound = false;
function enableMetadataDragMove(container) {
  if (metadataDragBound) return;
  metadataDragBound = true;

  const handle = container.querySelector(".modal-metadata-header");
  if (!handle) return;

  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let dragging = false;

  handle.addEventListener("mousedown", (e) => {
    // 閉じるボタン上ではドラッグ開始しない。
    if (e.target.closest(".modal-metadata-close")) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const r = container.getBoundingClientRect();
    originLeft = r.left;
    originTop = r.top;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    container.style.left = originLeft + (e.clientX - startX) + "px";
    container.style.top = originTop + (e.clientY - startY) + "px";
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
  });
}

export function showStringSearchUsageGuide() {
  const overlay = document.getElementById("usage-guide-modal-overlay");
  const container = document.getElementById("usage-guide-modal-container");
  if (overlay) overlay.style.display = "block";
  if (container) container.style.display = "flex";
}

export function closeUsageGuideModal() {
  const overlay = document.getElementById("usage-guide-modal-overlay");
  const container = document.getElementById("usage-guide-modal-container");
  if (overlay) overlay.style.display = "none";
  if (container) container.style.display = "none";
}

export const fieldsForModalTable = [
  "ファイル名",
  "開始文字位置",
  "終了文字位置",
  "文境界",
  "書字形出現形",
  "語彙素",
  "語彙素読み",
  "品詞",
  "活用型",
  "活用形",
  "発音形出現形",
  "語種",
  "原文文字列",
];

export function setupModalListeners() {
  try {
    const metaCloseButton = document.getElementById("modal-metadata-close");
    if (metaCloseButton)
      metaCloseButton.addEventListener("click", closeModalMetadataTable);
    else console.warn("[ui.js] modal-metadata-close not found");

    const metaOverlay = document.getElementById("modal-metadata-overlay");
    if (metaOverlay)
      metaOverlay.addEventListener("click", closeModalMetadataTable);
    else console.warn("[ui.js] modal-metadata-overlay not found");

    const usageGuideButton = document.getElementById(
      "string-usage-guide-button"
    );
    if (usageGuideButton)
      usageGuideButton.addEventListener("click", showStringSearchUsageGuide);
    else console.warn("[ui.js] string-usage-guide-button not found");

    const usageCloseButton = document.getElementById("usage-guide-modal-close");
    if (usageCloseButton)
      usageCloseButton.addEventListener("click", closeUsageGuideModal);
    else console.warn("[ui.js] usage-guide-modal-close not found");

    const usageOverlay = document.getElementById("usage-guide-modal-overlay");
    if (usageOverlay)
      usageOverlay.addEventListener("click", closeUsageGuideModal);
    else console.warn("[ui.js] usage-guide-modal-overlay not found");

    const conditionModalOverlay = document.getElementById(
      "search-condition-modal-overlay"
    );
    if (conditionModalOverlay) {
      conditionModalOverlay.addEventListener("click", () => {
        const container = document.getElementById(
          "search-condition-modal-container"
        );
        conditionModalOverlay.style.display = "none";
        if (container) container.style.display = "none";
      });
    } else {
      console.warn("[ui.js] search-condition-modal-overlay not found");
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeModalMetadataTable();
        closeUsageGuideModal();
        const condInputOverlay = document.getElementById(
          "search-condition-modal-overlay"
        );
        const condInputContainer = document.getElementById(
          "search-condition-modal-container"
        );
        if (condInputOverlay) condInputOverlay.style.display = "none";
        if (condInputContainer) condInputContainer.style.display = "none";
      }
    });
  } catch (error) {
    console.error("[ui.js] Error setting up modal listeners:", error);
  }
}

function addTokenRowToMetadataTable(tableBody, token, isKey = false) {
  if (!token) return;

  const row = document.createElement("tr");
  if (isKey) {
    row.className = "key-row";
  }

  fieldsForModalTable.forEach((internalFieldKey) => {
    const cell = document.createElement("td");
    let value = "";

    if (token.isErrorToken) {
      if (internalFieldKey === "書字形出現形") {
        value = token.errorInfo?.message || "[エラー]";
      } else if (internalFieldKey === "ファイル名") {
        value = token.ファイル名 || "[不明なファイル]";
      } else {
        value = "-";
      }
    } else {
      if (internalFieldKey === "終了文字位置") {
        value = String(token.終了文字位置 ?? "");
      } else {
        value = token[internalFieldKey] ?? "";
      }
    }
    cell.textContent =
      typeof isValidValue === "function" && isValidValue(value)
        ? String(value)
        : "";
    row.appendChild(cell);
  });
  tableBody.appendChild(row);
}

function getContextTokensForMetadata(tokenId, contextSize = 10) {
  const currentCorpusData = appState.getCorpusData();
  if (!currentCorpusData?.tokens) {
    console.error("getContextTokensForMetadata: Corpus data error");
    return {
      preContext: [],
      postContext: [],
      keyToken: null,
      preContextText: "",
      postContextText: "",
    };
  }
  const tokens = currentCorpusData.tokens;
  const isUpload = appState.getActiveDataSourceType() === "upload";

  if (tokenId < 0 || tokenId >= tokens.length) {
    console.error(`getContextTokensForMetadata: Invalid tokenId: ${tokenId}`);
    return null;
  }
  const currentToken = tokens[tokenId];
  if (!currentToken) {
    console.error(
      `getContextTokensForMetadata: Token not found for tokenId: ${tokenId}`
    );
    return null;
  }

  const targetSpeakerId =
    !isUpload && currentToken.話者ID ? currentToken.話者ID : null;
  const currentFileId = currentToken.ファイル名;

  const preContextTokensRaw = [];
  for (
    let i = tokenId - 1;
    i >= 0 && preContextTokensRaw.length < contextSize;
    i--
  ) {
    const preToken = tokens[i];
    if (!preToken) break;

    if (!isUpload && targetSpeakerId) {
      if (preToken.話者ID !== targetSpeakerId) {
        break;
      }
    } else {
      if (preToken.ファイル名 !== currentFileId) {
        break;
      }
    }
    preContextTokensRaw.unshift(preToken);
  }

  const postContextTokens = [];
  for (
    let i = tokenId + 1;
    i < tokens.length && postContextTokens.length < contextSize;
    i++
  ) {
    const postToken = tokens[i];
    if (!postToken) break;

    if (!isUpload && targetSpeakerId) {
      if (postToken.話者ID !== targetSpeakerId) {
        break;
      }
    } else {
      if (postToken.ファイル名 !== currentFileId) {
        break;
      }
    }
    postContextTokens.push(postToken);
  }

  return {
    preContextTokens: preContextTokensRaw,
    postContextTokens,
    keyToken: currentToken,
  };
}

function getContextTokensForRange(firstTokenId, lastTokenId, contextSize) {
  const currentCorpusData = appState.getCorpusData();
  if (!currentCorpusData?.tokens) {
    return {
      preContextTokens: [],
      postContextTokens: [],
    };
  }

  const tokens = currentCorpusData.tokens;
  const firstToken = tokens[firstTokenId];
  const lastToken = tokens[lastTokenId];

  if (!firstToken || !lastToken) {
    return {
      preContextTokens: [],
      postContextTokens: [],
    };
  }

  const currentFileId = firstToken.ファイル名;
  const isUpload = appState.getActiveDataSourceType() === "upload";
  const targetSpeakerId =
    !isUpload && firstToken.話者ID ? firstToken.話者ID : null;

  const preContextTokens = [];
  for (
    let i = firstTokenId - 1;
    i >= 0 && preContextTokens.length < contextSize;
    i--
  ) {
    const preToken = tokens[i];
    if (!preToken) break;

    if (!isUpload && targetSpeakerId) {
      if (preToken.話者ID !== targetSpeakerId) break;
    } else {
      if (preToken.ファイル名 !== currentFileId) break;
    }
    preContextTokens.unshift(preToken);
  }

  const postContextTokens = [];
  for (
    let i = lastTokenId + 1;
    i < tokens.length && postContextTokens.length < contextSize;
    i++
  ) {
    const postToken = tokens[i];
    if (!postToken) break;

    if (!isUpload && targetSpeakerId) {
      if (postToken.話者ID !== targetSpeakerId) break;
    } else {
      if (postToken.ファイル名 !== currentFileId) break;
    }
    postContextTokens.push(postToken);
  }

  return {
    preContextTokens,
    postContextTokens,
  };
}

function updateModalTableHeader() {
  const modalTableHead = document.querySelector(
    "#modal-metadata-table thead tr"
  );
  if (modalTableHead) {
    const headerCells = modalTableHead.children;
    fieldsForModalTable.forEach((fieldKey, index) => {
      if (headerCells[index]) {
        let displayName = fieldKey;
        headerCells[index].textContent = displayName;
      }
    });
  }
}
