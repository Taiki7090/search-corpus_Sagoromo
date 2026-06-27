import {
  columnOrderInternalKeys,
  uploadHiddenInternalKeys,
} from "./ui-constants.js";
import {
  getActiveDataSourceType,
  getCorpusData,
  getStringSearchResultObjects,
  getUnitSearchResultIds,
} from "../store/app-state.js";

// Follow the display column order, excluding the hidden columns. "原文文字列"
// is expanded into the three original-text columns (前/キー/後).
const csvColumnKeys = columnOrderInternalKeys
  .filter((key) => !uploadHiddenInternalKeys.includes(key))
  .flatMap((key) =>
    key === "原文文字列" ? ["原文前文脈", "原文文字列", "原文後文脈"] : [key]
  );

// Header labels that differ from the internal key.
const csvHeaderLabelOverrides = {
  "page-lineBegining": "丁数・行数",
};

const csvHeaderLabels = csvColumnKeys.map(
  (key) => csvHeaderLabelOverrides[key] || key
);

export function exportSearchResultsToCsv(type) {
  const corpusData = getCorpusData();
  const allTokens = corpusData?.tokens || [];
  const fileMetadata = corpusData?.file_metadata || {};
  const isUpload = getActiveDataSourceType() === "upload";

  const { separatorText, contextSize } = getContextSettings(type);

  const rows =
    type === "string"
      ? buildStringSearchRows(
          getStringSearchResultObjects() || [],
          allTokens,
          fileMetadata,
          separatorText,
          contextSize,
          isUpload
        )
      : buildUnitSearchRows(
          getUnitSearchResultIds() || [],
          allTokens,
          fileMetadata,
          separatorText,
          contextSize,
          isUpload
        );

  if (!rows.length) {
    alert("検索結果がありません。");
    return;
  }

  const headerLine = csvHeaderLabels.map(csvEscape).join(",");
  const dataLines = rows.map((row) => row.map(csvEscape).join(","));
  const csvContent = [headerLine, ...dataLines].join("\r\n");
  const csvWithBom = "﻿" + csvContent;

  const fileName = buildDefaultFileName();
  saveCsvContent(csvWithBom, fileName);
}

function buildUnitSearchRows(
  resultItems,
  allTokens,
  fileMetadata,
  separatorText,
  contextSize,
  isUpload
) {
  return resultItems
    .map((item) => {
      const tokenId = item?.tokenId;
      if (typeof tokenId !== "number") return null;
      const token = allTokens[tokenId];
      if (!token) return null;

      const metadata = fileMetadata[token.ファイル名] || {};
      const context = buildUnitContextText(
        tokenId,
        allTokens,
        separatorText,
        contextSize
      );

      return csvColumnKeys.map((internalKey) =>
        getCsvCellValue({
          internalKey,
          token,
          metadata,
          context,
          keyText: token.書字形出現形 || "",
          originalKeyText: token.原文文字列 || "",
          isUpload,
        })
      );
    })
    .filter(Boolean);
}

function buildStringSearchRows(
  results,
  allTokens,
  fileMetadata,
  separatorText,
  contextSize,
  isUpload
) {
  return results
    .map((result) => {
      const token = result?.token;
      if (!token) return null;

      const metadata =
        result.metadata || fileMetadata[token.ファイル名] || {};
      const context = buildStringContextText(
        result.firstTokenId,
        result.lastTokenId,
        allTokens,
        separatorText,
        contextSize,
        isUpload
      );

      const originalKeyText = buildOriginalKeyText(
        result.firstTokenId,
        result.lastTokenId,
        allTokens
      );

      return csvColumnKeys.map((internalKey) =>
        getCsvCellValue({
          internalKey,
          token,
          metadata,
          context,
          keyText: token.書字形出現形 || "",
          originalKeyText,
          isUpload,
        })
      );
    })
    .filter(Boolean);
}

function buildOriginalKeyText(firstTokenId, lastTokenId, allTokens) {
  const parts = [];
  for (let i = firstTokenId; i <= lastTokenId; i++) {
    const token = allTokens[i];
    if (token) parts.push(token.原文文字列 || "");
  }
  return parts.join("");
}

function getCsvCellValue({
  internalKey,
  token,
  metadata,
  context,
  keyText,
  originalKeyText,
  isUpload,
}) {
  if (!token) return "";

  switch (internalKey) {
    case "ファイル名":
      return token.ファイル名 || "";
    case "開始文字位置":
      return token.開始文字位置 ?? "";
    case "終了文字位置":
      return token.終了文字位置 ?? "";
    case "文境界":
      return token.文境界 || "";
    case "前文脈":
      return context?.pre || "";
    case "キー":
      return keyText || "";
    case "後文脈":
      return context?.post || "";
    case "語彙素":
      return token.語彙素 || "";
    case "語彙素読み":
      return token.語彙素読み || "";
    case "品詞":
      return token.品詞 || "";
    case "活用型":
      return token.活用型 || "";
    case "活用形":
      return token.活用形 || "";
    case "書字形出現形":
      return token.書字形出現形 || "";
    case "発音形出現形":
      return token.発音形出現形 || "";
    case "語種":
      return token.語種 || "";
    case "原文前文脈":
      return context?.originalPre || "";
    case "原文文字列":
      return originalKeyText || "";
    case "原文後文脈":
      return context?.originalPost || "";
    case "巻名":
      return isUpload
        ? token.巻名 || ""
        : metadata.recording_volume || token.巻名 || "";
    case "page-lineBegining":
      return token["page-lineBegining"] || "";
    case "伝本名":
      return metadata.speaker_name || (isUpload ? token.伝本名 : "") || "";
    case "対校表番号":
      return token.対校表番号 || "";
    default:
      return "";
  }
}

function buildUnitContextText(
  tokenId,
  allTokens,
  separatorText,
  contextSize
) {
  const token = allTokens[tokenId];
  if (!token) return { pre: "", post: "", originalPre: "", originalPost: "" };

  const currentFileId = token.ファイル名;
  const preTokens = [];
  const preOriginalTokens = [];
  const postTokens = [];
  const postOriginalTokens = [];

  for (
    let i = tokenId - 1;
    i >= 0 && preTokens.length < contextSize;
    i--
  ) {
    const current = allTokens[i];
    if (!current || current.ファイル名 !== currentFileId) break;
    preTokens.unshift(current.書字形出現形 || "");
    preOriginalTokens.unshift(current.原文文字列 || "");
  }

  for (
    let i = tokenId + 1;
    i < allTokens.length && postTokens.length < contextSize;
    i++
  ) {
    const current = allTokens[i];
    if (!current || current.ファイル名 !== currentFileId) break;
    postTokens.push(current.書字形出現形 || "");
    postOriginalTokens.push(current.原文文字列 || "");
  }

  return {
    pre: formatContextSide(preTokens, separatorText, "pre"),
    post: formatContextSide(postTokens, separatorText, "post"),
    originalPre: formatContextSide(preOriginalTokens, "", "pre"),
    originalPost: formatContextSide(postOriginalTokens, "", "post"),
  };
}

function buildStringContextText(
  firstTokenId,
  lastTokenId,
  allTokens,
  separatorText,
  contextSize,
  isUpload
) {
  const lastToken = allTokens[lastTokenId];
  const baseToken = lastToken || allTokens[firstTokenId];
  if (!baseToken) return { pre: "", post: "", originalPre: "", originalPost: "" };

  const boundaryFileId = baseToken.ファイル名;
  const boundarySpeakerId =
    !isUpload && baseToken.話者ID ? baseToken.話者ID : null;

  const preTokens = [];
  const preOriginalTokens = [];
  for (
    let i = lastTokenId - 1;
    i >= 0 && preTokens.length < contextSize;
    i--
  ) {
    const token = allTokens[i];
    if (!token) break;
    if (!isSameContextBoundary(token, boundaryFileId, boundarySpeakerId, isUpload))
      break;
    preTokens.unshift(token.書字形出現形 || "");
    preOriginalTokens.unshift(token.原文文字列 || "");
  }

  const postTokens = [];
  const postOriginalTokens = [];
  for (
    let i = lastTokenId + 1;
    i < allTokens.length && postTokens.length < contextSize;
    i++
  ) {
    const token = allTokens[i];
    if (!token) break;
    if (!isSameContextBoundary(token, boundaryFileId, boundarySpeakerId, isUpload))
      break;
    postTokens.push(token.書字形出現形 || "");
    postOriginalTokens.push(token.原文文字列 || "");
  }

  return {
    pre: formatContextSide(preTokens, separatorText, "pre"),
    post: formatContextSide(postTokens, separatorText, "post"),
    originalPre: formatContextSide(preOriginalTokens, "", "pre"),
    originalPost: formatContextSide(postOriginalTokens, "", "post"),
  };
}

function isSameContextBoundary(token, fileId, speakerId, isUpload) {
  if (isUpload) return token.ファイル名 === fileId;
  if (speakerId) return token.話者ID === speakerId;
  return token.ファイル名 === fileId;
}

function formatContextSide(tokens, separatorText, side) {
  if (!tokens.length) return "";
  const joined = tokens.join(separatorText);
  if (!separatorText) return joined;
  return side === "pre" ? joined + separatorText : separatorText + joined;
}

function getContextSettings(type) {
  const separatorId =
    type === "string" ? "string-context-separator" : "context-separator";
  const sizeId = type === "string" ? "string-context-size" : "context-size";

  const separatorElement = document.getElementById(separatorId);
  const separatorValue = separatorElement ? separatorElement.value : "|";
  const separatorText = separatorValue === "none" ? "" : separatorValue;

  const contextSizeElement = document.getElementById(sizeId);
  const contextSize =
    parseInt(contextSizeElement ? contextSizeElement.value : "20", 10) || 20;

  return { separatorText, contextSize };
}

function buildDefaultFileName() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `kwic_${timestamp}.csv`;
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/["\r\n,]/.test(text) || /^\s|\s$/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

async function saveCsvContent(content, fileName) {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: "CSV",
            accept: { "text/csv": [".csv"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return;
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
      console.warn(
        "[CSV Export] showSaveFilePicker failed, falling back to download.",
        error
      );
    }
  }

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
