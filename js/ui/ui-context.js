import { escapeHtml } from "../utils/text-utils.js";

export function getContextTokens(
  tokenId,
  allTokens,
  contextSeparatorText,
  actualContextSize,
  highlightInfo = { pre: new Set(), post: new Set() }
) {
  if (
    allTokens === null ||
    allTokens === undefined ||
    !Array.isArray(allTokens)
  ) {
    console.error(
      "[getContextTokens] `allTokens` is null, undefined, or not an array."
    );
    return {
      preContextTokens: [],
      postContextTokens: [],
      preContextText: "",
      postContextText: "",
      keyToken: null,
      separator: contextSeparatorText || "",
    };
  }

  if (
    typeof tokenId !== "number" ||
    tokenId < 0 ||
    tokenId >= allTokens.length
  ) {
    console.error(
      `[getContextTokens] Invalid tokenId: ${tokenId}. It must be a number within the bounds of allTokens.`
    );
    return {
      preContextTokens: [],
      postContextTokens: [],
      preContextText: "",
      postContextText: "",
      keyToken: null,
      separator: contextSeparatorText || "",
    };
  }

  const currentToken = allTokens[tokenId];
  if (!currentToken) {
    console.error(
      `[getContextTokens] Token not found for tokenId: ${tokenId}. currentToken is undefined or null.`
    );
    return {
      preContextTokens: [],
      postContextTokens: [],
      preContextText: "",
      postContextText: "",
      keyToken: null,
      separator: contextSeparatorText || "",
    };
  }

  const currentFileId = currentToken.ファイル名;

  const preContextTokens = [];
  const preContextTextParts = [];
  for (
    let i = tokenId - 1;
    i >= 0 && preContextTokens.length < actualContextSize;
    i--
  ) {
    const token = allTokens[i];
    if (!token || token.ファイル名 !== currentFileId) {
      break;
    }

    preContextTokens.unshift(token);
    const surface = escapeHtml(token.書字形出現形 || "");
    const isHighlighted =
      highlightInfo &&
      highlightInfo.pre instanceof Set &&
      highlightInfo.pre.has(i);
    const wordSpan = `<span class="context-word" data-token-id="${i}">${surface}</span>`;
    preContextTextParts.unshift(
      isHighlighted ? `<span class="highlight">(${wordSpan})</span>` : wordSpan
    );
  }

  const postContextTokens = [];
  const postContextTextParts = [];
  for (
    let i = tokenId + 1;
    i < allTokens.length && postContextTokens.length < actualContextSize;
    i++
  ) {
    const token = allTokens[i];
    if (!token || token.ファイル名 !== currentFileId) {
      break;
    }

    postContextTokens.push(token);
    const surface = escapeHtml(token.書字形出現形 || "");
    const isHighlighted =
      highlightInfo &&
      highlightInfo.post instanceof Set &&
      highlightInfo.post.has(i);
    const wordSpan = `<span class="context-word" data-token-id="${i}">${surface}</span>`;
    postContextTextParts.push(
      isHighlighted ? `<span class="highlight">(${wordSpan})</span>` : wordSpan
    );
  }

  let preContextText = preContextTextParts.join(contextSeparatorText);
  let postContextText = postContextTextParts.join(contextSeparatorText);

  if (preContextText && contextSeparatorText) {
    preContextText += contextSeparatorText;
  }
  if (postContextText && contextSeparatorText) {
    postContextText = contextSeparatorText + postContextText;
  }

  return {
    preContextTokens,
    postContextTokens,
    preContextText,
    postContextText,
    keyToken: currentToken,
    separator: contextSeparatorText,
  };
}

/**
 * 原文文字列データについて、前文脈と後文脈を取得する関数
 * getContextTokens と同様の処理で、原文文字列フィールドを使用します
 * @param {number} tokenId - トークンID
 * @param {Array} allTokens - 全トークンの配列
 * @param {string} contextSeparatorText - コンテキスト区切り文字列
 * @param {number} actualContextSize - 前後のコンテキストサイズ
 * @param {Object} highlightInfo - ハイライト情報（pre/post: Set）
 * @returns {Object} コンテキスト情報オブジェクト
 */
export function getOriginalTextContextTokens(
  tokenId,
  allTokens,
  contextSeparatorText,
  actualContextSize,
  highlightInfo = { pre: new Set(), post: new Set() }
) {
  if (
    allTokens === null ||
    allTokens === undefined ||
    !Array.isArray(allTokens)
  ) {
    console.error(
      "[getOriginalTextContextTokens] `allTokens` is null, undefined, or not an array."
    );
    return {
      preContextTokens: [],
      postContextTokens: [],
      preContextText: "",
      postContextText: "",
      keyToken: null,
      separator: contextSeparatorText || "",
    };
  }

  if (
    typeof tokenId !== "number" ||
    tokenId < 0 ||
    tokenId >= allTokens.length
  ) {
    console.error(
      `[getOriginalTextContextTokens] Invalid tokenId: ${tokenId}. It must be a number within the bounds of allTokens.`
    );
    return {
      preContextTokens: [],
      postContextTokens: [],
      preContextText: "",
      postContextText: "",
      keyToken: null,
      separator: contextSeparatorText || "",
    };
  }

  const currentToken = allTokens[tokenId];
  if (!currentToken) {
    console.error(
      `[getOriginalTextContextTokens] Token not found for tokenId: ${tokenId}. currentToken is undefined or null.`
    );
    return {
      preContextTokens: [],
      postContextTokens: [],
      preContextText: "",
      postContextText: "",
      keyToken: null,
      separator: contextSeparatorText || "",
    };
  }

  const currentFileId = currentToken.ファイル名;

  const preContextTokens = [];
  const preContextTextParts = [];
  for (
    let i = tokenId - 1;
    i >= 0 && preContextTokens.length < actualContextSize;
    i--
  ) {
    const token = allTokens[i];
    if (!token || token.ファイル名 !== currentFileId) {
      break;
    }

    preContextTokens.unshift(token);
    const originalText = escapeHtml(token.原文文字列 || "");
    const isHighlighted =
      highlightInfo &&
      highlightInfo.pre instanceof Set &&
      highlightInfo.pre.has(i);
    const wordSpan = `<span class="context-word" data-token-id="${i}">${originalText}</span>`;
    preContextTextParts.unshift(
      isHighlighted ? `<span class="highlight">(${wordSpan})</span>` : wordSpan
    );
  }

  const postContextTokens = [];
  const postContextTextParts = [];
  for (
    let i = tokenId + 1;
    i < allTokens.length && postContextTokens.length < actualContextSize;
    i++
  ) {
    const token = allTokens[i];
    if (!token || token.ファイル名 !== currentFileId) {
      break;
    }

    postContextTokens.push(token);
    const originalText = escapeHtml(token.原文文字列 || "");
    const isHighlighted =
      highlightInfo &&
      highlightInfo.post instanceof Set &&
      highlightInfo.post.has(i);
    const wordSpan = `<span class="context-word" data-token-id="${i}">${originalText}</span>`;
    postContextTextParts.push(
      isHighlighted ? `<span class="highlight">(${wordSpan})</span>` : wordSpan
    );
  }

  const preContextText = preContextTextParts.join("");
  const postContextText = postContextTextParts.join("");

  return {
    preContextTokens,
    postContextTokens,
    preContextText,
    postContextText,
    keyToken: currentToken,
    separator: "",
  };
}
