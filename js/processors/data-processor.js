import { extractWorkTitleFromFileName } from "../utils/text-utils.js";
import { fixedWorkMetadata } from "../data/metadata-definition.js";
import { columnOrderInternalKeys } from "../ui/ui-constants.js";
import { lookupPageLine } from "../data/sagoromo-line-map.js";

export function parseOpenCHJLine(
  line,
  globalLineIndex,
  uploadedFileNameWithoutExt
) {
  const fields = line.split("\t");
  const expectedFieldsArray = [13, 14];
  const initialToken = {};
  const keysForInit = columnOrderInternalKeys;

  keysForInit.forEach((key) => {
    initialToken[key] = null;
  });

  let rawOpenCHJFirstColumn = fields[0];

  const keyFromUploadedFile = uploadedFileNameWithoutExt;

  let finalManuscriptName = null;
  let finalVolume = null;
  let metaSourceFound = false;

  if (keyFromUploadedFile === "demo_data") {
    const demoKeyMatch = rawOpenCHJFirstColumn?.match(/^\w{4}-(.{2})_\d{6,9}(_[1-4])/);
    if (demoKeyMatch && fixedWorkMetadata) {
      const demoMetaKey = demoKeyMatch[1] + demoKeyMatch[2];
      const demoMeta = fixedWorkMetadata[demoMetaKey];
      if (demoMeta) {
        finalManuscriptName = demoMeta.manuscriptName ?? null;
        finalVolume = demoMeta.volume ?? null;
      }
    }
    metaSourceFound = true;
  }

  if (!metaSourceFound && fixedWorkMetadata) {
    let primaryMetaKeyCandidate = keyFromUploadedFile;
    const genjiPrefixMatch = keyFromUploadedFile.match(/^\w{4}-(.{2})_\d{6,9}(_[1-4])/);

    if (genjiPrefixMatch && genjiPrefixMatch[1] && genjiPrefixMatch[2]) {
      primaryMetaKeyCandidate = genjiPrefixMatch[1] + genjiPrefixMatch[2];
    }

    if (fixedWorkMetadata.hasOwnProperty(primaryMetaKeyCandidate)) {
      const meta = fixedWorkMetadata[primaryMetaKeyCandidate];
      finalManuscriptName = meta.manuscriptName ?? null;
      finalVolume = meta.volume ?? null;
      metaSourceFound = true;
    }
    if (!metaSourceFound) {
      const baseTitleKey = extractWorkTitleFromFileName(
        primaryMetaKeyCandidate
      );
      if (baseTitleKey && fixedWorkMetadata.hasOwnProperty(baseTitleKey)) {
        const meta = fixedWorkMetadata[baseTitleKey];
        finalManuscriptName = meta.manuscriptName ?? null;
        finalVolume = meta.volume ?? null;
        metaSourceFound = true;
      }
    }
  }

  if (!metaSourceFound) {
    finalVolume = "巻一"; // デフォルト値を設定
  }

  let tokenFileName =
    rawOpenCHJFirstColumn === undefined
      ? uploadedFileNameWithoutExt + ".txt"
      : fields[0] || uploadedFileNameWithoutExt + ".txt";

  if (!expectedFieldsArray.includes(fields.length)) {
    const errorToken = {
      ...initialToken,
      ファイル名: tokenFileName,
      書字形出現形: line.substring(0, 50) + (line.length > 50 ? "..." : ""),
      品詞: "エラー",
      終了文字位置: `error_line_${globalLineIndex + 1}`,
      伝本名: finalManuscriptName,
      対校表番号: fields.length > 1 ? fields[1] || "" : "",
      isErrorToken: true,
      errorInfo: {
        line: globalLineIndex + 1,
        message: `フィールド数が不正です (${
          fields.length
        }個, 期待値: ${expectedFieldsArray.join("または")}個)`,
        content: line,
      },
    };
    return errorToken;
  }
  try {
    let startPos = parseInt(fields[2], 10);
    if (isNaN(startPos) || startPos < 0) startPos = 0;
    let endPos = parseInt(fields[3], 10);
    if (isNaN(endPos) || endPos < 0) endPos = startPos;

    const token = {
      ...initialToken,
      ファイル名: tokenFileName,
      開始文字位置: startPos,
      終了文字位置: String(endPos),
      文境界: fields[4] || "I",
      書字形出現形: fields[5] || "",
      語彙素: fields[6] || "",
      語彙素読み: fields[7] || "",
      品詞: fields[8] || "",
      活用型: fields[9] || "",
      活用形: fields[10] || "",
      発音形出現形: fields[11] || "",
      語種: fields[12] || "",
      原文文字列: fields.length === 14 ? fields[13] || "" : "",
      巻名: finalVolume,
      伝本名: finalManuscriptName,
      "page-lineBegining": lookupPageLine(tokenFileName, startPos),
      対校表番号: fields[1] || "",
      isErrorToken: false,
    };
    return token;
  } catch (parseError) {
    console.error(
      `[DataHandler:parseOpenCHJLine] Fatal error parsing line ${
        globalLineIndex + 1
      } for uploaded file ${uploadedFileNameWithoutExt}.txt:`,
      parseError,
      "Line content:",
      line
    );
    const fatalErrorToken = {
      ...initialToken,
      ファイル名: tokenFileName,
      書字形出現形: `[パースエラー: ${parseError.message}]`,
      品詞: "エラー",
      終了文字位置: `fatal_error_line_${globalLineIndex + 1}`,
      伝本名: finalManuscriptName,
      対校表番号: fields.length > 1 ? fields[1] || "" : "",
      isErrorToken: true,
      errorInfo: {
        line: globalLineIndex + 1,
        message: `致命的なパースエラー: ${parseError.message}`,
        content: line,
      },
    };
    return fatalErrorToken;
  }
}

export function generateIndexData(tokens) {
  const surface_index = {};
  const lemma_index = {};
  const pos_index = {};
  const utterance_index = {};

  if (!Array.isArray(tokens)) {
    console.error("Input 'tokens' is not an array!");
    return { surface_index, lemma_index, pos_index, utterance_index };
  }

  tokens.forEach((token, idx) => {
    const tokenId = idx;

    const surface = token["書字形出現形"];
    if (typeof surface === "string" && surface.trim() !== "") {
      const key = surface.trim();
      if (!surface_index[key]) surface_index[key] = [];
      surface_index[key].push(tokenId);
    }
    const lemma = token["語彙素"];
    if (typeof lemma === "string" && lemma.trim() !== "") {
      const key = lemma.trim();
      if (!lemma_index[key]) lemma_index[key] = [];
      lemma_index[key].push(tokenId);
    }
    const pos = token["品詞"];
    if (typeof pos === "string" && pos.trim() !== "") {
      const key = pos.trim();
      if (!pos_index[key]) pos_index[key] = [];
      pos_index[key].push(tokenId);
    }
    const utteranceId = token["終了文字位置"];
    if (typeof utteranceId === "string" && utteranceId.trim() !== "") {
      const key = utteranceId.trim();
      if (!utterance_index[key]) utterance_index[key] = [];
      utterance_index[key].push(tokenId);
    }
  });

  return { surface_index, lemma_index, pos_index, utterance_index };
}

export function generateStatsData(tokens) {
  let filtered_tokens = 0;
  const fileSet = new Set();

  const volumeCounts = {
    "巻一": { total: 0, filtered: 0, files: new Set() },
    "巻二": { total: 0, filtered: 0, files: new Set() },
    "巻三": { total: 0, filtered: 0, files: new Set() },
    "巻四": { total: 0, filtered: 0, files: new Set() },
    unknown: { total: 0, filtered: 0, files: new Set() },
  };

  tokens.forEach((token) => {
    const fileName = token["ファイル名"];
    fileSet.add(fileName);
    const volume = token["巻名"];
    const bucket = volumeCounts[volume] || volumeCounts.unknown;

    bucket.files.add(fileName);
    bucket.total++;

    const pos = token["品詞"] || "";
    if (
      !(pos.startsWith("記号") || pos.startsWith("補助記号") || pos === "空白")
    ) {
      filtered_tokens++;
      bucket.filtered++;
    }
  });

  const stats = {
    total_tokens: tokens.length,
    filtered_tokens: filtered_tokens,
    error_tokens: 0,
    file_count: fileSet.size,
    volume_stats: {},
  };

  for (const volumeKey in volumeCounts) {
    if (volumeCounts[volumeKey]) {
      stats.volume_stats[volumeKey] = {
        total_tokens: volumeCounts[volumeKey].total,
        filtered_tokens: volumeCounts[volumeKey].filtered,
        file_count: volumeCounts[volumeKey].files.size,
      };
    }
  }

  return stats;
}

export function generateFileMetadata(tokens) {
  const metadata = {};
  if (!tokens || tokens.length === 0) {
    console.warn("[DataHandler] No tokens provided to generateFileMetadata.");
    return metadata;
  }

  const fileDataMap = new Map();

  for (const token of tokens) {
    const openCHJFileName = token["ファイル名"];

    if (!fileDataMap.has(openCHJFileName)) {
      fileDataMap.set(openCHJFileName, {
        recording_volume: token["巻名"],
        speaker_name: token["伝本名"],
        page_line_begining: token["page-lineBegining"],
        speaker_count: null,
        speaker_id: null,
        speaker_birthyear: null,
        speaker_age: null,
        speaker_occupation: null,
        recording_time: null,
        related_document: null,
        url: null,
      });
    }
  }

  for (const [fileNameKey, metaValues] of fileDataMap) {
    metadata[fileNameKey] = metaValues;
  }

  return metadata;
}

export function cleanupMetadata(corpusDataToClean) {
  if (corpusDataToClean && corpusDataToClean.file_metadata) {
    for (const pid in corpusDataToClean.file_metadata) {
      if (Object.hasOwnProperty.call(corpusDataToClean.file_metadata, pid)) {
        const metadata = corpusDataToClean.file_metadata[pid];
        for (const key in metadata) {
          if (Object.hasOwnProperty.call(metadata, key)) {
            const value = metadata[key];
            if (
              (typeof value === "number" && isNaN(value)) ||
              value === "NaN" ||
              value === "nan"
            ) {
              metadata[key] = null;
            }
          }
        }
      }
    }
  }
}
