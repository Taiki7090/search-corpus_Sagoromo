import {
  showUploadLoading,
  updateButtonStates as updateUploadButtonStatesExternal,
  updateFileList as updateUploadFileListExternal,
  updateUploadStatus as updateOverallUploadStatus,
  displayErrorsToUser as showUploadErrorModal,
  resetUploadUI,
  displayProcessedFiles,
  clearSelectedFilesDisplayArea,
  showErrorMessageInFilesDisplay,
  getCheckedFileIndices,
} from "../ui/ui-upload.js";

import {
  saveCurrentStates,
  updateCurrentDataSourceDisplay,
  updateDataSourceUI,
} from "../controllers/ui-controller.js";

import { updateDataSourceRadioButtons } from "../ui/ui-datasource.js";

import {
  parseOpenCHJLine,
  generateIndexData,
  generateStatsData,
  generateFileMetadata,
} from "../processors/data-processor.js";

import { validateFiles } from "../validators/file-validator.js";
import { sendDataToWorker, updateSearchButtonState } from "./search-service.js";
import { clearSearchResults } from "../search/search-conditions-common.js";
import {
  getCorpusData,
  getIndexData,
  getActiveDataSourceType,
  setActiveDataSourceType,
  storeUploadedData as appStoreUploadedData,
  clearUploadedDataState as appClearUploadedDataState,
  setIsWorkerDataLoaded,
} from "../store/app-state.js";

let selectedFiles = null;
let dataSourceDefaultRadio = null;
let dataSourceUploadRadio = null;
let fileUploadInput = null;
let uploadButton = null;
let clearUploadButton = null;
let clearSelectedFilesButton = null;

export function switchDataSource(type) {
  const previousDataSourceType = getActiveDataSourceType() || "default";

  if (typeof saveCurrentStates === "function") {
    saveCurrentStates(previousDataSourceType);
  }

  if (typeof clearSearchResults === "function") {
    clearSearchResults("unit");
    clearSearchResults("string");
  } else {
    console.error(
      "[DataHandler] clearSearchResults function not found! Manual clear attempt..."
    );
    const unitResultsElement = document.getElementById("unit-results");
    if (unitResultsElement) unitResultsElement.style.display = "none";
    const stringResultsElement = document.getElementById("string-results");
    if (stringResultsElement) stringResultsElement.style.display = "none";
    const unitResultStatsElement = document.getElementById("unit-result-stats");
    if (unitResultStatsElement) unitResultStatsElement.innerHTML = "";
    const stringResultStatsElement = document.getElementById(
      "string-result-stats"
    );
    if (stringResultStatsElement) stringResultStatsElement.innerHTML = "";
    const resultsTableBodyElement =
      document.getElementById("results-table-body");
    if (resultsTableBodyElement) resultsTableBodyElement.innerHTML = "";
    const stringResultsTableBodyElement = document.getElementById(
      "string-results-table-body"
    );
    if (stringResultsTableBodyElement)
      stringResultsTableBodyElement.innerHTML = "";
    const unitPagiElement = document.getElementById("pagination");
    if (unitPagiElement) {
      unitPagiElement.innerHTML = "";
      unitPagiElement.style.display = "none";
    }
    const stringPagiElement = document.getElementById("string-pagination");
    if (stringPagiElement) {
      stringPagiElement.innerHTML = "";
      stringPagiElement.style.display = "none";
    }
  }
  const unitTheadTr = document.querySelector("#results-table thead tr");
  if (unitTheadTr) unitTheadTr.innerHTML = "";
  const stringTheadTr = document.querySelector(
    "#string-results-table thead tr"
  );
  if (stringTheadTr) stringTheadTr.innerHTML = "";

  setActiveDataSourceType(type);

  const currentCorpusData = getCorpusData();
  const currentIndexData = getIndexData();

  const targetCorpusExists = !!(currentCorpusData && currentIndexData);
  const switched = true;

  if (switched) {
    if (typeof updateCurrentDataSourceDisplay === "function") {
      updateCurrentDataSourceDisplay(getActiveDataSourceType());
    }
    if (typeof updateDataSourceUI === "function") {
      updateDataSourceUI(getActiveDataSourceType());
    }

    if (targetCorpusExists) {
      if (typeof sendDataToWorker === "function") {
        sendDataToWorker(currentCorpusData, currentIndexData);
      } else {
        console.error("[DataHandler] sendDataToWorker function not found!");
        if (typeof updateSearchButtonState === "function") {
          setIsWorkerDataLoaded(false);
          updateSearchButtonState();
        }
      }
    } else {
      console.warn(
        `[DataHandler] Data for source '${getActiveDataSourceType()}' is not ready for worker (after switch).`
      );
      if (typeof updateSearchButtonState === "function") {
        setIsWorkerDataLoaded(false);
        updateSearchButtonState();
      }
    }
  } else {
    console.error(
      `[DataHandler] Switch to data source type '${type}' failed (not switched).`
    );
    if (typeof updateSearchButtonState === "function") {
      setIsWorkerDataLoaded(false);
      updateSearchButtonState();
    }
  }
  return switched && targetCorpusExists;
}

export function initializeDataHandler() {
  dataSourceDefaultRadio = document.getElementById("data-source-default");
  dataSourceUploadRadio = document.getElementById("data-source-upload");
  fileUploadInput = document.getElementById("file-upload");
  uploadButton = document.getElementById("upload-button");
  clearUploadButton = document.getElementById("clear-upload-button");
  clearSelectedFilesButton = document.getElementById(
    "clear-selected-files-button"
  );

  if (dataSourceUploadRadio) {
    dataSourceUploadRadio.addEventListener("change", () => {
      if (dataSourceUploadRadio.checked) {
        const selectedType = "upload";
        if (typeof updateDataSourceRadioButtons === "function")
          updateDataSourceRadioButtons(selectedType);
        if (typeof updateCurrentDataSourceDisplay === "function")
          updateCurrentDataSourceDisplay(selectedType);
        if (typeof updateDataSourceUI === "function")
          updateDataSourceUI(selectedType);
        const switchSuccess = switchDataSource(selectedType);
        if (!switchSuccess)
          console.warn("[DataHandler] switchDataSource('upload') failed.");
      }
    });
  }
  if (dataSourceDefaultRadio) {
    dataSourceDefaultRadio.addEventListener("change", () => {
      if (dataSourceDefaultRadio.checked) {
        const selectedType = "default";
        if (typeof updateDataSourceRadioButtons === "function")
          updateDataSourceRadioButtons(selectedType);
        if (typeof updateCurrentDataSourceDisplay === "function")
          updateCurrentDataSourceDisplay(selectedType);
        if (typeof updateDataSourceUI === "function")
          updateDataSourceUI(selectedType);
        const switchSuccess = switchDataSource(selectedType);
        if (!switchSuccess)
          console.warn("[DataHandler] switchDataSource('default') failed.");
      }
    });
  }

  if (fileUploadInput) {
    fileUploadInput.addEventListener("change", (event) => {
      const files = Array.from(event.target.files);
      const MAX_FILES = 250;
      const MAX_TOTAL_SIZE_MB = 100;
      const MAX_TOTAL_SIZE_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024;
      const ALLOWED_EXTENSIONS = ["txt", "tsv"];
      let errorMessages = [];
      let validFiles = [];

      // 既にアップロードに選択済みのファイルを保持し、今回選択分を追加する
      const existingFiles = Array.isArray(selectedFiles) ? selectedFiles : [];
      const fileKey = (file) => `${file.name}__${file.size}`;
      const existingKeys = new Set(existingFiles.map(fileKey));
      let duplicateCount = 0;

      files.forEach((file) => {
        const fileExtension = file.name?.split(".").pop()?.toLowerCase() || "";
        if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
          errorMessages.push(`不正な拡張子: ${file.name}`);
          return;
        }
        // 既存・今回選択分の両方で同名・同サイズの重複を除外する
        const key = fileKey(file);
        if (existingKeys.has(key)) {
          duplicateCount++;
          return;
        }
        existingKeys.add(key);
        validFiles.push(file);
      });

      // 既存ファイルと今回の有効ファイルを合算して上限を判定する
      const combinedFiles = [...existingFiles, ...validFiles];
      const combinedTotalSize = combinedFiles.reduce(
        (sum, file) => sum + file.size,
        0
      );

      if (combinedFiles.length > MAX_FILES)
        errorMessages.push(
          `ファイル数上限 ${MAX_FILES} を超えています (${combinedFiles.length} 個)`
        );
      if (combinedTotalSize > MAX_TOTAL_SIZE_BYTES)
        errorMessages.push(
          `合計サイズ上限 ${MAX_TOTAL_SIZE_MB}MB を超えています (${(
            combinedTotalSize /
            (1024 * 1024)
          ).toFixed(1)}MB)`
        );

      // 同じファイルを再選択できるよう、入力値はここでリセットする
      fileUploadInput.value = "";

      if (errorMessages.length > 0) {
        if (typeof updateOverallUploadStatus === "function")
          updateOverallUploadStatus(
            "エラー:\n" + errorMessages.join("\n"),
            "error"
          );
        // エラー時は既存の選択を維持する
        if (typeof updateUploadFileListExternal === "function")
          updateUploadFileListExternal(selectedFiles);
        if (typeof updateUploadButtonStatesExternal === "function")
          updateUploadButtonStatesExternal(
            existingFiles.length > 0 ? "fileSelected" : "error",
            selectedFiles
          );
        console.warn("[DataHandler] Upload validation failed:", errorMessages);
        return;
      }

      selectedFiles = combinedFiles;

      if (duplicateCount > 0 && typeof updateOverallUploadStatus === "function") {
        updateOverallUploadStatus(
          `${duplicateCount} 件の重複ファイルをスキップしました`,
          "warning"
        );
      } else if (typeof updateOverallUploadStatus === "function") {
        updateOverallUploadStatus("", "");
      }

      if (typeof updateUploadFileListExternal === "function") {
        updateUploadFileListExternal(selectedFiles);
      } else {
        console.error(
          "[DataHandler] updateUploadFileListExternal is not a function"
        );
      }
      if (typeof updateUploadButtonStatesExternal === "function") {
        updateUploadButtonStatesExternal("fileSelected", selectedFiles);
      } else {
        console.error(
          "[DataHandler] updateUploadButtonStatesExternal is not a function"
        );
      }

      const uploadedFilesAreaElement = document.getElementById(
        "uploaded-files-area"
      );
      if (uploadedFilesAreaElement)
        uploadedFilesAreaElement.style.display = "none";
      const processedFilesListElement = document.getElementById(
        "processed-files-list"
      );
      if (processedFilesListElement) processedFilesListElement.innerHTML = "";
    });
  }

  if (uploadButton) {
    uploadButton.addEventListener("click", () => {
      if (typeof handleFileUpload === "function") handleFileUpload();
      else
        console.error(
          "handleFileUpload function not defined in data-handler.js!"
        );
    });
  }
  if (clearUploadButton) {
    clearUploadButton.addEventListener("click", () => {
      if (typeof clearUploadedData === "function") clearUploadedData(true);
      else
        console.error(
          "clearUploadedData function not defined in data-handler.js!"
        );
    });
  }
  if (clearSelectedFilesButton) {
    clearSelectedFilesButton.addEventListener("click", () => {
      const existingFiles = Array.isArray(selectedFiles) ? selectedFiles : [];
      if (existingFiles.length === 0) return;

      // チェックの付いているファイルのインデックスのみを取得して削除する
      const checkedIndices =
        typeof getCheckedFileIndices === "function"
          ? getCheckedFileIndices()
          : [];

      if (checkedIndices.length === 0) {
        if (typeof updateOverallUploadStatus === "function")
          updateOverallUploadStatus(
            "削除するファイルにチェックを入れてください。",
            "error"
          );
        return;
      }

      const removeSet = new Set(checkedIndices);
      selectedFiles = existingFiles.filter(
        (_, index) => !removeSet.has(index)
      );

      if (selectedFiles.length === 0) {
        // 全て削除された場合は選択状態をリセットする
        if (typeof updateUploadFileListExternal === "function")
          updateUploadFileListExternal(selectedFiles);
        if (typeof clearSelectedFilesDisplayArea === "function")
          clearSelectedFilesDisplayArea();
        if (typeof updateOverallUploadStatus === "function")
          updateOverallUploadStatus("", "");
        if (typeof updateUploadButtonStatesExternal === "function")
          updateUploadButtonStatesExternal("cleared", selectedFiles);
      } else {
        if (typeof updateUploadFileListExternal === "function")
          updateUploadFileListExternal(selectedFiles);
        if (typeof updateOverallUploadStatus === "function")
          updateOverallUploadStatus(
            `${checkedIndices.length} 件のファイルを削除しました`,
            "success"
          );
        if (typeof updateUploadButtonStatesExternal === "function")
          updateUploadButtonStatesExternal("fileSelected", selectedFiles);
      }
    });
  }
}

export async function loadDemoDataFromFile(filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch demo data file "${filePath}": ${response.status} ${response.statusText}`
      );
    }
    const fileContent = await response.text();
    let allTokens = [];
    let globalLineIndex = 0;
    const lines = fileContent.split("\n");
    for (let j = 0; j < lines.length; j++) {
      const rawLine = lines[j];
      const line = rawLine.trim();
      if (line) {
        const parsedResult = parseOpenCHJLine(
          line,
          globalLineIndex,
          "demo_data"
        );
        globalLineIndex++;
        if (parsedResult && parsedResult.isErrorToken) {
          console.warn(
            `[DataHandler] Error in demo data, line ${globalLineIndex}: ${
              parsedResult.errorInfo?.message || "Unknown error"
            }`
          );
        }
        if (parsedResult) allTokens.push(parsedResult);
      }
    }
    if (allTokens.length === 0) {
      throw new Error(
        `デモデータファイル "${filePath}" から有効なトークンを抽出できませんでした。`
      );
    }
    const validTokens = allTokens.filter((t) => t && !t.isErrorToken);
    if (validTokens.length === 0) {
      throw new Error(
        `デモデータファイル "${filePath}" から有効なトークンを抽出できませんでした。`
      );
    }
    const indexDataLocal = generateIndexData(validTokens);
    const statsDataLocal = generateStatsData(validTokens);
    const fileMetadataLocal = generateFileMetadata(validTokens);
    const corpusDataLocal = {
      tokens: validTokens,
      sentences: {},
      file_metadata: fileMetadataLocal,
      statistics: statsDataLocal,
    };
    return {
      success: true,
      corpusData: corpusDataLocal,
      indexData: indexDataLocal,
      statsData: statsDataLocal,
    };
  } catch (error) {
    console.error(
      `[DataHandler] Error in loadDemoDataFromFile (${filePath}):`,
      error
    );
    return { success: false, error: error.message };
  }
}

async function handleFileUpload() {
  if (
    !selectedFiles ||
    !Array.isArray(selectedFiles) ||
    selectedFiles.length === 0
  ) {
    if (typeof updateOverallUploadStatus === "function")
      updateOverallUploadStatus("ファイルが選択されていません。", "error");
    if (typeof updateUploadButtonStatesExternal === "function")
      updateUploadButtonStatesExternal("error", selectedFiles || []);
    return;
  }

  const filesToProcess = [...selectedFiles];

  if (typeof showUploadLoading === "function")
    showUploadLoading(true, "ファイル検証中...");
  if (typeof updateUploadButtonStatesExternal === "function")
    updateUploadButtonStatesExternal("processing", filesToProcess);
  if (typeof clearSelectedFilesDisplayArea === "function")
    clearSelectedFilesDisplayArea();

  let allTokens = [];
  let totalRecoverableErrorCount = 0;
  let totalFatalErrorCount = 0;
  const errorsByFile = {};
  const detailedErrorLines = [];
  let totalDetailsCount = 0;
  const MAX_DETAILS_PER_FILE = 10;
  const MAX_TOTAL_DETAILS = 50;

  try {
    let validationResult;
    try {
      validationResult = await validateFiles(filesToProcess);
    } catch (validationError) {
      console.error("[DEBUG] ファイル検証中にエラー:", validationError);
      if (typeof showUploadLoading === "function") showUploadLoading(false);
      throw validationError;
    }

    if (!validationResult.valid) {
      if (typeof showUploadLoading === "function") showUploadLoading(false);
      if (validationResult.showModal) {
        const errorDetails = validationResult.error;
        const errorCount = (errorDetails.match(/\n/g) || []).length + 1;
        const shouldContinue = await showUploadErrorModal(
          errorCount,
          errorDetails
        );
        if (!shouldContinue) {
          if (typeof updateUploadButtonStatesExternal === "function")
            updateUploadButtonStatesExternal("error", []);
          selectedFiles = [];
          if (fileUploadInput) fileUploadInput.value = "";
          if (typeof updateUploadFileListExternal === "function")
            updateUploadFileListExternal([]);
          return;
        }
      } else {
        if (typeof updateOverallUploadStatus === "function")
          updateOverallUploadStatus(
            "エラー:\n" + validationResult.error,
            "error"
          );
        if (typeof updateUploadButtonStatesExternal === "function")
          updateUploadButtonStatesExternal("error", []);
        return;
      }
    }

    if (validationResult.warnings && validationResult.warnings.length > 0) {
      if (validationResult.warnings.length > 3) {
        if (typeof updateOverallUploadStatus === "function") {
          updateOverallUploadStatus(
            "警告: " +
              validationResult.warnings.slice(0, 3).join("\n") +
              (validationResult.warnings.length > 3
                ? `\n... 他 ${validationResult.warnings.length - 3} 件`
                : ""),
            "warning"
          );
        }
        const confirmContinue = confirm(
          "以下の警告がありますが、処理を続行しますか？\n\n" +
            validationResult.warnings.slice(0, 5).join("\n") +
            (validationResult.warnings.length > 5
              ? `\n... 他 ${validationResult.warnings.length - 5} 件`
              : "")
        );
        if (!confirmContinue) {
          if (typeof updateUploadButtonStatesExternal === "function")
            updateUploadButtonStatesExternal("error", selectedFiles);
          if (typeof showUploadLoading === "function") showUploadLoading(false);
          return;
        }
      }
    }

    if (typeof showUploadLoading === "function")
      showUploadLoading(true, "読込中...");
    const fileReadPromises = filesToProcess.map((file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (
            event.target &&
            event.target.result !== null &&
            event.target.result !== undefined
          )
            resolve({ name: file.name, content: event.target.result });
          else {
            console.warn(
              `File ${file.name} read success, but result is null/undefined.`
            );
            resolve({ name: file.name, content: "" });
          }
        };
        reader.onerror = (error) =>
          reject({
            name: file.name,
            error: error || new Error("Unknown file read error"),
          });
        try {
          reader.readAsText(file, "UTF-8");
        } catch (readError) {
          reject({ name: file.name, error: readError });
        }
      });
    });
    const fileContents = await Promise.allSettled(fileReadPromises);

    let globalLineIndexForParsing = 0;
    for (let i = 0; i < fileContents.length; i++) {
      const loopResult = fileContents[i];
      const currentUploadedFileName = filesToProcess[i].name;
      if (loopResult.status === "fulfilled") {
        const fileData = loopResult.value;
        const currentFileNameForParsing =
          fileData?.name || currentUploadedFileName;
        if (!fileData || typeof fileData.content !== "string") {
          totalFatalErrorCount++;
          if (!errorsByFile[currentFileNameForParsing])
            errorsByFile[currentFileNameForParsing] = { count: 0, details: [] };
          errorsByFile[currentFileNameForParsing].count++;
          if (
            errorsByFile[currentFileNameForParsing].details.length <
              MAX_DETAILS_PER_FILE &&
            totalDetailsCount < MAX_TOTAL_DETAILS
          ) {
            const detailMsg = `読み込み成功しましたが、内容が不正です。`;
            errorsByFile[currentFileNameForParsing].details.push(detailMsg);
            detailedErrorLines.push(
              `ファイル: ${currentFileNameForParsing}, ${detailMsg}`
            );
            totalDetailsCount++;
          }
          continue;
        }
        const lines = fileData.content.split("\n");
        let fileLineNum = 1;
        let uploadedFileNameWithoutExt = currentUploadedFileName;
        if (uploadedFileNameWithoutExt.toLowerCase().endsWith(".txt"))
          uploadedFileNameWithoutExt = uploadedFileNameWithoutExt.substring(
            0,
            uploadedFileNameWithoutExt.length - 4
          );
        for (let j = 0; j < lines.length; j++) {
          const rawLine = lines[j];
          const line = rawLine.trim();
          if (line) {
            try {
              const parsedResult = parseOpenCHJLine(
                line,
                globalLineIndexForParsing,
                uploadedFileNameWithoutExt
              );
              globalLineIndexForParsing++;
              if (parsedResult && parsedResult.isErrorToken) {
                if (
                  parsedResult.errorInfo &&
                  parsedResult.errorInfo.message.startsWith(
                    "致命的なパースエラー"
                  )
                )
                  totalFatalErrorCount++;
                else totalRecoverableErrorCount++;
                const errorSourceFile =
                  parsedResult.ファイル名 || currentFileNameForParsing;
                if (!errorsByFile[errorSourceFile])
                  errorsByFile[errorSourceFile] = { count: 0, details: [] };
                errorsByFile[errorSourceFile].count++;
                const errorInfo = parsedResult.errorInfo || {};
                const detailMsg = `行 ${fileLineNum} (全体 ${
                  errorInfo.line || globalLineIndexForParsing
                }): ${errorInfo.message || "不明なパースエラー"}`;
                if (
                  errorsByFile[errorSourceFile].details.length <
                    MAX_DETAILS_PER_FILE &&
                  totalDetailsCount < MAX_TOTAL_DETAILS
                ) {
                  errorsByFile[errorSourceFile].details.push(detailMsg);
                  detailedErrorLines.push(
                    `ファイル(${currentUploadedFileName})内データ「${errorSourceFile}」: ${detailMsg}`
                  );
                  totalDetailsCount++;
                } else if (
                  errorsByFile[errorSourceFile].details.length ===
                    MAX_DETAILS_PER_FILE &&
                  !errorsByFile[errorSourceFile].details.some((d) =>
                    d.includes("省略")
                  )
                ) {
                  const 省略Msg = "... (ファイル内エラー多数のため省略)";
                  errorsByFile[errorSourceFile].details.push(省略Msg);
                  detailedErrorLines.push(
                    `ファイル(${currentUploadedFileName})内データ「${errorSourceFile}」: ${省略Msg}`
                  );
                }
                allTokens.push(parsedResult);
                if (
                  totalFatalErrorCount > 500 ||
                  (totalRecoverableErrorCount > 1000 &&
                    errorsByFile[errorSourceFile].count > 100)
                )
                  throw new Error(
                    `ファイル "${currentUploadedFileName}" (データ内ファイル名 "${errorSourceFile}") でエラーが多すぎるため処理を中断しました。`
                  );
              } else if (parsedResult) allTokens.push(parsedResult);
            } catch (lineError) {
              console.error("[DEBUG] 行処理中にエラー:", lineError);
              throw lineError;
            }
          }
          fileLineNum++;
        }
      } else {
        const reason = loopResult.reason;
        const failedFileName = reason?.name || currentUploadedFileName;
        const errorMsg = `ファイル "${failedFileName}" の読み込み失敗: ${
          reason?.error?.message || reason?.error || "不明なエラー"
        }`;
        console.error(`[DataHandler] ${errorMsg}`);
        totalFatalErrorCount++;
        if (!errorsByFile[failedFileName])
          errorsByFile[failedFileName] = { count: 0, details: [] };
        errorsByFile[failedFileName].count++;
        if (
          errorsByFile[failedFileName].details.length < MAX_DETAILS_PER_FILE &&
          totalDetailsCount < MAX_TOTAL_DETAILS
        ) {
          const detailMsg = "ファイルの読み込みに失敗しました。";
          errorsByFile[failedFileName].details.push(detailMsg);
          detailedErrorLines.push(`ファイル: ${failedFileName}, ${detailMsg}`);
          totalDetailsCount++;
        }
      }
      if (i % 50 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const totalErrorCountForModal =
      totalRecoverableErrorCount + totalFatalErrorCount;
    if (allTokens.filter((t) => !t.isErrorToken).length === 0) {
      let errorMsg = "有効なトークンを抽出できませんでした。";
      let errorDetailsHtml = "";
      if (totalErrorCountForModal > 0) {
        const errorSummary = Object.entries(errorsByFile)
          .map(([f, info]) => `${f}(${info.count}件)`)
          .join(", ");
        errorMsg = `エラー(${errorSummary}、致命的エラー${totalFatalErrorCount}件含む)のため、有効なトークンがありませんでした。処理を中断しました。`;
        errorDetailsHtml = `<pre>${detailedErrorLines
          .join("\n")
          .replace(/</g, "<")
          .replace(/>/g, ">")}</pre>`;
        if (
          totalDetailsCount >= MAX_TOTAL_DETAILS &&
          detailedErrorLines.length > 0
        )
          errorDetailsHtml += `<div style="font-style: italic; margin-top: 5px;">... (${
            totalErrorCountForModal - totalDetailsCount
          }件以上のエラーは省略)</div>`;
      }
      if (typeof showErrorMessageInFilesDisplay === "function")
        showErrorMessageInFilesDisplay(
          errorDetailsHtml ||
            `<div>${errorMsg.replace(/</g, "<").replace(/>/g, ">")}</div>`
        );
      throw new Error(errorMsg);
    }

    if (totalErrorCountForModal > 0) {
      let errorListForModal = detailedErrorLines.join("\n");
      if (
        totalDetailsCount >= MAX_TOTAL_DETAILS &&
        detailedErrorLines.length > 0
      )
        errorListForModal += `\n\n... (${
          totalErrorCountForModal - totalDetailsCount
        }件以上のエラーは省略)`;
      const shouldContinue = await showUploadErrorModal(
        totalErrorCountForModal,
        errorListForModal
      );
      if (!shouldContinue) {
        if (typeof showUploadLoading === "function") showUploadLoading(false);
        selectedFiles = [];
        if (fileUploadInput) fileUploadInput.value = "";
        if (typeof updateUploadFileListExternal === "function")
          updateUploadFileListExternal([]);
        if (typeof updateUploadButtonStatesExternal === "function")
          updateUploadButtonStatesExternal("cleared", []);
        if (typeof updateOverallUploadStatus === "function")
          updateOverallUploadStatus("", "");
        if (typeof clearSelectedFilesDisplayArea === "function")
          clearSelectedFilesDisplayArea();
        return;
      } else {
        if (typeof updateOverallUploadStatus === "function")
          updateOverallUploadStatus("", "");
      }
    } else {
      if (typeof updateOverallUploadStatus === "function")
        updateOverallUploadStatus("", "");
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
    const validTokens = allTokens.filter((t) => t && !t.isErrorToken);
    const indexDataLocal = generateIndexData(validTokens);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const statsDataLocal = generateStatsData(validTokens);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const fileMetadataLocal = generateFileMetadata(validTokens);
    const corpusDataLocal = {
      tokens: validTokens,
      sentences: {},
      file_metadata: fileMetadataLocal,
      statistics: statsDataLocal,
    };

    appStoreUploadedData(corpusDataLocal, indexDataLocal, statsDataLocal);

    let totalFileSizeMB = 0;
    filesToProcess.forEach((file) => {
      totalFileSizeMB += file.size / (1024 * 1024);
    });
    const formattedTotalSize = totalFileSizeMB.toFixed(2);
    const validTokenCount = validTokens.length;
    let processedHeader = `読み込まれたデータ (${filesToProcess.length}ファイル, 合計${formattedTotalSize}MB, ${validTokenCount}語):`;
    if (totalErrorCountForModal > 0) {
      processedHeader = `読み込まれたデータ (${filesToProcess.length}ファイル, 合計${formattedTotalSize}MB, ${validTokenCount}語 (エラー含む総計 ${allTokens.length}語), エラー${totalErrorCountForModal}件`;
      if (totalFatalErrorCount > 0)
        processedHeader += ` [うち致命的エラー${totalFatalErrorCount}件]`;
      processedHeader += "):";
    }

    if (typeof updateOverallUploadStatus === "function")
      setTimeout(() => updateOverallUploadStatus("", ""), 100);
    if (typeof clearSelectedFilesDisplayArea === "function")
      clearSelectedFilesDisplayArea();
    selectedFiles = [];

    if (typeof displayProcessedFiles === "function")
      displayProcessedFiles(filesToProcess, processedHeader);

    const switchSuccess = switchDataSource("upload");
    if (switchSuccess) {
      if (typeof updateCurrentDataSourceDisplay === "function")
        updateCurrentDataSourceDisplay("upload");
    }
    if (typeof updateUploadButtonStatesExternal === "function")
      updateUploadButtonStatesExternal("processed", []);
    if (typeof updateUploadFileListExternal === "function")
      updateUploadFileListExternal([]);
  } catch (error) {
    if (typeof showUploadLoading === "function") showUploadLoading(false);
    let errorToShowShort = `エラー: ${
      error.message?.split("\n")[0] || "不明なエラー"
    }`;
    console.error("[DataHandler] Caught Error Object Details:", error);
    if (error.stack)
      console.error("[DataHandler] Caught Error Stack:", error.stack);
    if (
      detailedErrorLines.length > 0 &&
      !error.message?.includes("詳細はコンソール")
    ) {
      console.error(
        "[DataHandler] Associated detailed parse errors:\n" +
          detailedErrorLines.join("\n")
      );
      errorToShowShort += ` (詳細はコンソールを確認してください)`;
    }

    if (typeof updateOverallUploadStatus === "function")
      updateOverallUploadStatus(errorToShowShort, "error");

    let errorDetailsContent = "";
    if (detailedErrorLines.length > 0) {
      errorDetailsContent = detailedErrorLines.join("\n");
      if (
        totalDetailsCount >= MAX_TOTAL_DETAILS &&
        detailedErrorLines.length > 0
      ) {
        errorDetailsContent += `\n\n... (${
          totalRecoverableErrorCount + totalFatalErrorCount - totalDetailsCount
        }件以上のエラーは省略)`;
      }
      if (typeof showErrorMessageInFilesDisplay === "function")
        showErrorMessageInFilesDisplay(
          `<pre>${errorDetailsContent
            .replace(/</g, "<")
            .replace(/>/g, ">")}</pre>`
        );
    } else {
      if (typeof showErrorMessageInFilesDisplay === "function")
        showErrorMessageInFilesDisplay(
          `<div>${
            error.message
              ? error.message
                  .replace(/</g, "<")
                  .replace(/>/g, ">")
                  .replace(/\n/g, "<br>")
              : errorToShowShort.replace(/</g, "<").replace(/>/g, ">")
          }</div>`
        );
    }

    clearUploadedData(false);
    selectedFiles = [];
    if (typeof updateUploadButtonStatesExternal === "function")
      updateUploadButtonStatesExternal("error", []);
    if (fileUploadInput) fileUploadInput.value = "";
    if (typeof updateUploadFileListExternal === "function")
      updateUploadFileListExternal([]);
  } finally {
    if (typeof showUploadLoading === "function") showUploadLoading(false);
  }
}

function clearUploadedData(resetUI = true) {
  appClearUploadedDataState();
  selectedFiles = [];
  switchDataSource("default");

  if (resetUI) {
    if (typeof resetUploadUI === "function") resetUploadUI();
  }
}
