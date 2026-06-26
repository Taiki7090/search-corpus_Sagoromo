import { getCorpusData, getActiveDataSourceType } from "../store/app-state.js";
import { escapeHtml } from "../utils/text-utils.js";

export function processStringSearchResultsInChunks(
  workerMatchInfos,
  workerTotalHits,
  callback
) {
  const MAX_PROCESSING_TIME = 8;
  const detailedResults = [];
  let currentIndex = 0;

  const separatorElement = document.getElementById("string-context-separator");
  const separator = separatorElement ? separatorElement.value : "|";
  const separatorText = separator === "none" ? "" : separator;

  const contextSizeElement = document.getElementById("string-context-size");
  let contextSize = 20;
  if (contextSizeElement) {
    const parsedSize = parseInt(contextSizeElement.value, 10);
    if (!isNaN(parsedSize) && parsedSize > 0) {
      contextSize = parsedSize;
    }
  }

  const currentCorpusData = getCorpusData();
  if (!currentCorpusData || !currentCorpusData.tokens) {
    console.error(
      "[ProcessStringResults] Corpus data or tokens not available via appState."
    );
    callback([], 0);
    return;
  }
  const allTokens = currentCorpusData.tokens;
  const fileBlocks = new Map();

  for (let i = 0; i < allTokens.length; i++) {
    const token = allTokens[i];
    if (!token || !token.ファイル名) continue;

    const blockKey = token.ファイル名;
    if (!fileBlocks.has(blockKey)) {
      fileBlocks.set(blockKey, {
        text: "",
        indicesInfo: [],
      });
    }

    const block = fileBlocks.get(blockKey);
    const surface = token.書字形出現形 || "";
    const start = block.text.length;
    block.text += surface;
    block.indicesInfo.push({
      originalIndex: i,
      start: start,
      end: start + surface.length,
    });
  }

  let lastProgressUpdate = 0;
  const PROGRESS_UPDATE_INTERVAL = 500;

  let dynamicBatchSize = 10;
  let lastProcessingTime = 0;

  function processNextChunk() {
    const startTime = performance.now();
    let processedInThisChunk = 0;

    if (lastProcessingTime > 0) {
      if (lastProcessingTime < 4) {
        dynamicBatchSize = Math.min(dynamicBatchSize * 1.5, 100);
      } else if (lastProcessingTime > 12) {
        dynamicBatchSize = Math.max(dynamicBatchSize * 0.7, 5);
      }
    }

    while (
      currentIndex < workerMatchInfos.length &&
      processedInThisChunk < Math.floor(dynamicBatchSize) &&
      performance.now() - startTime < MAX_PROCESSING_TIME
    ) {
      const matchInfo = workerMatchInfos[currentIndex];

      try {
        const result = processMatchInfo(
          matchInfo,
          currentIndex,
          allTokens,
          fileBlocks,
          separatorText,
          contextSize
        );
        if (result) {
          detailedResults.push(result);
        }
      } catch (rebuildError) {
        console.error(
          `Error processing match at index ${currentIndex}:`,
          rebuildError
        );
      }

      currentIndex++;
      processedInThisChunk++;
    }

    lastProcessingTime = performance.now() - startTime;

    if (
      currentIndex - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL ||
      currentIndex === workerMatchInfos.length
    ) {
      lastProgressUpdate = currentIndex;

      const progress = Math.round(
        (currentIndex / workerMatchInfos.length) * 100
      );
      if (progress < 100) {
        requestAnimationFrame(() => {
          if (typeof showLoading === "function") {
            showLoading(true, `検索結果を処理中... ${progress}%`, "search");
          }
        });
      }
    }

    if (currentIndex < workerMatchInfos.length) {
      requestAnimationFrame(processNextChunk);
    } else {
      callback(detailedResults, workerTotalHits);
    }
  }
  requestAnimationFrame(processNextChunk);
}

function processMatchInfo(
  matchInfo,
  resultIndex,
  allTokens,
  fileBlocks,
  separatorText,
  contextSize
) {
  const currentCorpusData = getCorpusData();
  if (!currentCorpusData) {
    console.warn(
      `[ProcessMatchInfo] currentCorpusData is null at index ${resultIndex}. Skipping.`
    );
    return null;
  }

  const workerLastTokenId = matchInfo.tokenId;
  const matchStartIndexInFileText = matchInfo.matchStartIndex;
  const rawMatchedString = matchInfo.matchedString;

  if (
    workerLastTokenId === undefined ||
    workerLastTokenId === null ||
    workerLastTokenId < 0 ||
    workerLastTokenId >= allTokens.length
  ) {
    console.warn(
      `[Search.js:processMatchInfo] Invalid workerLastTokenId (${workerLastTokenId}) in matchInfo at index ${resultIndex}. Skipping.`
    );
    return null;
  }

  const lastTokenFromWorker = allTokens[workerLastTokenId];
  if (!lastTokenFromWorker || !lastTokenFromWorker.ファイル名) {
    console.warn(
      `[Search.js:processMatchInfo] Token or token.ファイル名 not found for ID ${workerLastTokenId}. Skipping.`
    );
    return null;
  }

  const blockKey = lastTokenFromWorker.ファイル名;
  const blockData = fileBlocks.get(blockKey);
  if (!blockData) {
    console.warn(
      `[Search.js:processMatchInfo] Block data not found for file "${blockKey}". Skipping.`
    );
    return null;
  }

  const matchEndIndexInFileText =
    matchStartIndexInFileText + rawMatchedString.length;
  const tokenIndicesInfoInBlock = blockData.indicesInfo;

  const overlappingTokenInfoForMatch = tokenIndicesInfoInBlock
    .filter(
      (pos) =>
        pos &&
        matchStartIndexInFileText < pos.end &&
        matchEndIndexInFileText > pos.start
    )
    .map((pos) => ({
      token: allTokens[pos.originalIndex],
      index: pos.originalIndex,
    }))
    .filter((info) => info && info.token && info.index !== undefined);

  if (overlappingTokenInfoForMatch.length === 0) {
    console.warn(
      `[Search.js:processMatchInfo] No overlapping tokens found for match (start: ${matchStartIndexInFileText}, end: ${matchEndIndexInFileText}, text: "${rawMatchedString}") in file ${blockKey}. WorkerLastTokenId: ${workerLastTokenId}. Skipping.`
    );
    const fallbackLastToken = allTokens[workerLastTokenId];
    const fallbackMatchedText = fallbackLastToken.書字形出現形 || "";
    const fallbackKeyHtmlParts = [];

    fallbackKeyHtmlParts.push(
      `<span class="context-word" data-token-id="${workerLastTokenId}">${
        typeof escapeHtml === "function"
          ? escapeHtml(fallbackMatchedText)
          : fallbackMatchedText
      }</span>`
    );
    const fallbackKeyTextForDisplay = `<span class="matched-key">${fallbackKeyHtmlParts.join(
      ""
    )}</span>`;
    const fallbackContext = {
      preContextTokens: [],
      postContextTokens: [],
      preContextText: "",
      postContextText: "",
      keyTextForDisplay: fallbackKeyTextForDisplay,
      separator: separatorText,
    };
    const currentCorpusData = getCorpusData();
    const fallbackMetadata =
      currentCorpusData?.file_metadata?.[fallbackLastToken.ファイル名] || {};
    const fallbackResult = {
      token: fallbackLastToken,
      tokenId: workerLastTokenId,
      context: fallbackContext,
      utteranceId: fallbackLastToken.終了文字位置 || "",
      metadata: fallbackMetadata,
      matchedText: fallbackMatchedText,
      matchedTokens: [fallbackLastToken],
      firstTokenId: workerLastTokenId,
      lastTokenId: workerLastTokenId,
      keyTextForDisplay: fallbackKeyTextForDisplay,
    };
    return fallbackResult;
  }

  const matchedIndices = overlappingTokenInfoForMatch.map((info) => info.index);
  const firstTokenIdInMatch = Math.min(...matchedIndices);
  const lastTokenIdInMatch = Math.max(...matchedIndices);

  if (lastTokenIdInMatch !== workerLastTokenId) {
    console.warn(
      `[Search.js:processMatchInfo] Discrepancy: Worker's lastTokenId (${workerLastTokenId}) does not match calculated lastTokenIdInMatch (${lastTokenIdInMatch}) for match "${rawMatchedString}" in ${blockKey}. Using calculated lastTokenIdInMatch.`
    );
  }

  const reconstructedMatchInfo = {
    matchIndex: matchStartIndexInFileText,
    matchedString: rawMatchedString,
    matchEnd: matchEndIndexInFileText,
    overlappingTokenInfo: overlappingTokenInfoForMatch,
    firstTokenId: firstTokenIdInMatch,
    lastTokenId: lastTokenIdInMatch,
  };

  const {
    firstTokenId: matchFirstId,
    lastTokenId: matchLastId,
  } = reconstructedMatchInfo;

  const keySurface = allTokens[matchLastId]?.書字形出現形 || "";

  const context = {
    preContextText: "",
    postContextText: "",
    keyTextForDisplay: "",
    separator: separatorText,
  };
  const baseTokenForContext = allTokens[matchLastId];
  const contextFileIdForBoundary = baseTokenForContext.ファイル名;
  const isUpload = getActiveDataSourceType() === "upload";
  const contextSpeakerId =
    !isUpload && baseTokenForContext.話者ID ? baseTokenForContext.話者ID : null;

  const preContextHtmlPartsBeforeKey = [];
  for (
    let i = matchLastId - 1;
    i >= 0 && preContextHtmlPartsBeforeKey.length < contextSize;
    i--
  ) {
    const preToken = allTokens[i];
    if (!preToken) break;
    let breakLoop = false;
    if (isUpload) {
      if (preToken.ファイル名 !== contextFileIdForBoundary) breakLoop = true;
    } else {
      if (contextSpeakerId) {
        if (preToken.話者ID !== contextSpeakerId) breakLoop = true;
      } else {
        if (preToken.ファイル名 !== contextFileIdForBoundary) breakLoop = true;
      }
    }
    if (breakLoop) break;

    preContextHtmlPartsBeforeKey.unshift(
      `<span class="context-word" data-token-id="${i}">${escapeHtml(
        preToken.書字形出現形 || ""
      )}</span>`
    );
  }

  context.preContextText = preContextHtmlPartsBeforeKey.join(context.separator);
  if (context.preContextText && context.separator !== "") {
    context.preContextText += context.separator;
  }

  const postContextHtmlPartsAfterKey = [];
  for (
    let i = matchLastId + 1;
    i < allTokens.length && postContextHtmlPartsAfterKey.length < contextSize;
    i++
  ) {
    const postToken = allTokens[i];
    if (!postToken) break;
    let breakLoop = false;
    if (isUpload) {
      if (postToken.ファイル名 !== contextFileIdForBoundary) breakLoop = true;
    } else {
      if (contextSpeakerId) {
        if (postToken.話者ID !== contextSpeakerId) breakLoop = true;
      } else {
        if (postToken.ファイル名 !== contextFileIdForBoundary) breakLoop = true;
      }
    }
    if (breakLoop) break;

    postContextHtmlPartsAfterKey.push(
      `<span class="context-word" data-token-id="${i}">${escapeHtml(
        postToken.書字形出現形 || ""
      )}</span>`
    );
  }

  context.postContextText = postContextHtmlPartsAfterKey.join(
    context.separator
  );
  if (context.postContextText && context.separator !== "") {
    context.postContextText = context.separator + context.postContextText;
  }

  context.keyTextForDisplay = `<span class="matched-key">${escapeHtml(
    keySurface
  )}</span>`;

  const representativeTokenForResult = allTokens[matchLastId];
  const metadata =
    currentCorpusData?.file_metadata?.[
      representativeTokenForResult.ファイル名
    ] || {};
  const resultObject = {
    token: representativeTokenForResult,
    tokenId: matchLastId,
    context: context,
    utteranceId: representativeTokenForResult.終了文字位置 || "",
    metadata: metadata,
    matchedText: rawMatchedString,
    keyTextForDisplay: context.keyTextForDisplay,
    firstTokenId: matchFirstId,
    lastTokenId: matchLastId,
  };

  if (resultObject.token && resultObject.tokenId === matchLastId) {
    return resultObject;
  } else {
    console.error(
      `[Search.js:processMatchInfo] Internal inconsistency before returning result. Skipping.`,
      resultObject
    );
    return null;
  }
}
