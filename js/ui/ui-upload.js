import * as appState from "../store/app-state.js";
let fileUploadInput = null;
let uploadButton = null;
let selectedFilesDisplay = null;
let uploadStatusContainer = null;
let uploadStatusSpan = null;
let uploadedFilesArea = null;
let processedFilesList = null;
let loadingIndicator = null;
let clearSelectedFilesButton = null;
let dataSourceUploadRadio = null;
let dataSourceDefaultRadio = null;
let fileSelectLabel = null;
let clearUploadButton = null;

export function initializeUploadUI() {
  fileUploadInput = document.getElementById("file-upload");
  uploadButton = document.getElementById("upload-button");
  selectedFilesDisplay = document.getElementById("selected-files-display");
  uploadStatusContainer = document.getElementById("upload-status-container");
  uploadStatusSpan = document.getElementById("upload-status");
  uploadedFilesArea = document.getElementById("uploaded-files-area");
  processedFilesList = document.getElementById("processed-files-list");
  loadingIndicator = document.getElementById("loading-indicator");
  clearSelectedFilesButton = document.getElementById(
    "clear-selected-files-button"
  );
  dataSourceUploadRadio = document.getElementById("data-source-upload");
  dataSourceDefaultRadio = document.getElementById("data-source-default");
  fileSelectLabel = document.getElementById("file-select-label");
  clearUploadButton = document.getElementById("clear-upload-button");

  if (loadingIndicator) loadingIndicator.style.display = "none";
  if (typeof updateButtonStates === "function") {
    updateButtonStates("initial", []);
  }
  if (typeof updateFileList === "function") {
    updateFileList([]);
  }
  if (typeof updateUploadStatus === "function") updateUploadStatus("", "");
  if (uploadStatusContainer) uploadStatusContainer.style.display = "none";
}

export function showUploadLoading(show, message = "処理中...") {
  if (loadingIndicator) {
    if (show) {
      loadingIndicator.style.display = "flex";
      const loadingTextElement =
        loadingIndicator.querySelector(".loading-text");
      if (loadingTextElement) {
        loadingTextElement.textContent = message;
      }
    } else {
      loadingIndicator.style.display = "none";
    }
  } else {
    console.warn(
      "[UI Upload] loadingIndicator element not found in showUploadLoading."
    );
  }
}

export function updateButtonStates(state, currentSelectedFiles) {
  const hasSelectedFiles =
    currentSelectedFiles !== null &&
    Array.isArray(currentSelectedFiles) &&
    currentSelectedFiles.length > 0;
  const isUploadDataAvailable = appState.getUploadedCorpusData() !== null;

  const elements = {
    fileSelectLabel: fileSelectLabel,
    fileUploadInput: fileUploadInput,
    uploadButton: uploadButton,
    clearUploadButton: clearUploadButton,
    dataSourceUploadRadio: dataSourceUploadRadio,
    dataSourceDefaultRadio: dataSourceDefaultRadio,
    clearSelectedFilesButton: clearSelectedFilesButton,
  };

  let missingElement = false;
  const missingElementIds = [];
  for (const key in elements) {
    if (!elements[key]) {
      missingElementIds.push(key);
      missingElement = true;
    }
  }
  if (missingElement) {
    console.error(
      `[UI Upload:updateButtonStates] Missing critical elements: ${missingElementIds.join(
        ", "
      )}`
    );
    return;
  }

  let showClearSelectedButton = false;

  if (elements.fileSelectLabel)
    elements.fileSelectLabel.classList.remove("button-hidden");
  if (elements.uploadButton)
    elements.uploadButton.classList.remove("button-hidden");
  if (elements.clearUploadButton)
    elements.clearUploadButton.style.display = "none";

  switch (state) {
    case "initial":
    case "cleared":
      if (elements.fileSelectLabel)
        elements.fileSelectLabel.style.opacity = "1";
      if (elements.fileUploadInput) elements.fileUploadInput.disabled = false;
      if (elements.uploadButton) elements.uploadButton.disabled = true;
      if (elements.clearUploadButton) {
        elements.clearUploadButton.style.display = "none";
        elements.clearUploadButton.disabled = true;
      }
      if (elements.dataSourceUploadRadio)
        elements.dataSourceUploadRadio.disabled = !isUploadDataAvailable;
      if (elements.dataSourceUploadRadio)
        elements.dataSourceUploadRadio.checked = false;
      if (elements.dataSourceDefaultRadio)
        elements.dataSourceDefaultRadio.checked = true;
      if (elements.dataSourceDefaultRadio)
        elements.dataSourceDefaultRadio.disabled = false;
      showClearSelectedButton = false;
      break;
    case "fileSelected":
      if (elements.fileSelectLabel)
        elements.fileSelectLabel.style.opacity = "1";
      if (elements.fileUploadInput) elements.fileUploadInput.disabled = false;
      if (elements.uploadButton)
        elements.uploadButton.disabled = !hasSelectedFiles;
      if (elements.clearUploadButton) {
        elements.clearUploadButton.style.display = "none";
        elements.clearUploadButton.disabled = true;
      }
      if (elements.dataSourceUploadRadio)
        elements.dataSourceUploadRadio.disabled = true;
      if (elements.dataSourceUploadRadio)
        elements.dataSourceUploadRadio.checked = false;
      if (elements.dataSourceDefaultRadio)
        elements.dataSourceDefaultRadio.checked = true;
      if (elements.dataSourceDefaultRadio)
        elements.dataSourceDefaultRadio.disabled = false;
      showClearSelectedButton = hasSelectedFiles;
      break;
    case "processing":
      if (elements.fileSelectLabel)
        elements.fileSelectLabel.style.opacity = "0.5";
      if (elements.fileUploadInput) elements.fileUploadInput.disabled = true;
      if (elements.uploadButton) elements.uploadButton.disabled = true;
      if (elements.clearUploadButton) {
        elements.clearUploadButton.style.display = "none";
        elements.clearUploadButton.disabled = true;
      }
      if (elements.dataSourceUploadRadio)
        elements.dataSourceUploadRadio.disabled = true;
      if (elements.dataSourceDefaultRadio)
        elements.dataSourceDefaultRadio.disabled = true;
      showClearSelectedButton = false;
      break;
    case "processed":
      if (elements.fileSelectLabel)
        elements.fileSelectLabel.classList.add("button-hidden");
      if (elements.uploadButton)
        elements.uploadButton.classList.add("button-hidden");
      if (elements.fileUploadInput) elements.fileUploadInput.disabled = true;
      if (elements.clearUploadButton) {
        elements.clearUploadButton.style.display = "inline-flex";
        elements.clearUploadButton.disabled = false;
      }
      if (elements.dataSourceUploadRadio)
        elements.dataSourceUploadRadio.disabled = false;
      if (elements.dataSourceUploadRadio)
        elements.dataSourceUploadRadio.checked = true;
      if (elements.dataSourceDefaultRadio)
        elements.dataSourceDefaultRadio.checked = false;
      if (elements.dataSourceDefaultRadio)
        elements.dataSourceDefaultRadio.disabled = false;
      showClearSelectedButton = false;
      break;
    case "error":
      if (elements.fileSelectLabel)
        elements.fileSelectLabel.style.opacity = "1";
      if (elements.fileUploadInput) elements.fileUploadInput.disabled = false;
      if (elements.uploadButton) elements.uploadButton.disabled = true;
      if (elements.clearUploadButton) {
        elements.clearUploadButton.style.display = "none";
        elements.clearUploadButton.disabled = true;
      }
      if (elements.dataSourceUploadRadio)
        elements.dataSourceUploadRadio.disabled = !isUploadDataAvailable;
      if (elements.dataSourceUploadRadio)
        elements.dataSourceUploadRadio.checked = false;
      if (elements.dataSourceDefaultRadio)
        elements.dataSourceDefaultRadio.checked = true;
      if (elements.dataSourceDefaultRadio)
        elements.dataSourceDefaultRadio.disabled = false;
      showClearSelectedButton = hasSelectedFiles;
      break;
    default:
      console.warn(
        `[UI Upload:updateButtonStates] Unknown button state: ${state}. Setting to initial.`
      );
      updateButtonStates("initial");
      return;
  }

  if (elements.clearSelectedFilesButton) {
    if (showClearSelectedButton) {
      elements.clearSelectedFilesButton.classList.remove(
        "clear-selected-files-button-hidden"
      );
    } else {
      elements.clearSelectedFilesButton.classList.add(
        "clear-selected-files-button-hidden"
      );
    }
  }
}

export function updateFileList(currentSelectedFiles) {
  if (
    !selectedFilesDisplay ||
    !uploadStatusContainer ||
    !uploadStatusSpan ||
    !clearSelectedFilesButton
  ) {
    console.error("[UI Upload:updateFileList] Required elements not found.");
    return;
  }
  const selectedFilesContainer = document.getElementById(
    "selected-files-container"
  );

  let showFileListContainer = false;

  if (currentSelectedFiles && currentSelectedFiles.length > 0) {
    selectedFilesDisplay.innerHTML = "";
    selectedFilesDisplay.classList.remove("error-display", "info-display");
    selectedFilesDisplay.style.borderColor = "";
    selectedFilesDisplay.style.backgroundColor = "";

    const fragment = document.createDocumentFragment();
    currentSelectedFiles.forEach((file, index) => {
      const fileDiv = document.createElement("div");
      fileDiv.className = "selected-file-item";

      const label = document.createElement("label");
      label.className = "selected-file-label";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "selected-file-checkbox";
      checkbox.dataset.fileIndex = String(index);

      const nameSpan = document.createElement("span");
      nameSpan.className = "selected-file-name";
      nameSpan.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(
        2
      )} MB)`;
      nameSpan.title = file.name;

      label.appendChild(checkbox);
      label.appendChild(nameSpan);
      fileDiv.appendChild(label);
      fragment.appendChild(fileDiv);
    });
    selectedFilesDisplay.appendChild(fragment);
    selectedFilesDisplay.style.display = "block";

    if (selectedFilesContainer) selectedFilesContainer.style.display = "flex";
    showFileListContainer = true;

    clearSelectedFilesButton.classList.remove(
      "clear-selected-files-button-hidden"
    );
  } else {
    if (selectedFilesContainer) selectedFilesContainer.style.display = "none";
    if (!selectedFilesDisplay.classList.contains("error-display")) {
      selectedFilesDisplay.innerHTML = "";
      selectedFilesDisplay.style.display = "none";
    }
    showFileListContainer = false;
    clearSelectedFilesButton.classList.add(
      "clear-selected-files-button-hidden"
    );
  }

  const hasStatusMessage = uploadStatusSpan.textContent.trim() !== "";
  uploadStatusContainer.style.display =
    showFileListContainer || hasStatusMessage ? "block" : "none";
}

export function getCheckedFileIndices() {
  if (!selectedFilesDisplay) return [];
  const checkboxes = selectedFilesDisplay.querySelectorAll(
    ".selected-file-checkbox:checked"
  );
  return Array.from(checkboxes)
    .map((checkbox) => parseInt(checkbox.dataset.fileIndex, 10))
    .filter((index) => !Number.isNaN(index));
}

export function updateUploadStatus(message, statusType = "") {
  if (uploadStatusSpan && uploadStatusContainer) {
    uploadStatusSpan.textContent = message;
    uploadStatusSpan.className = "";
    if (statusType) {
      uploadStatusSpan.classList.add(statusType);
    }
    if (message.trim() !== "") {
      uploadStatusContainer.style.display = "block";
    } else {
      const selectedFilesContainer = document.getElementById(
        "selected-files-container"
      );
      if (
        !selectedFilesContainer ||
        selectedFilesContainer.style.display === "none"
      ) {
        uploadStatusContainer.style.display = "none";
      }
    }
  } else {
    console.warn(
      "[UI Upload:updateUploadStatus] Upload status span or container element not found."
    );
  }
}

export function clearSelectedFilesList() {
  if (fileUploadInput) fileUploadInput.value = "";
  updateFileList();
  if (uploadButton) uploadButton.disabled = true;
  updateUploadStatus("", "");
  updateButtonStates("cleared");
}

export function displayErrorsToUser(errorCount, errorDetails) {
  return new Promise((resolve) => {
    const existingModal = document.querySelector(".error-modal-container");
    if (existingModal) existingModal.remove();

    const dialogContainer = document.createElement("div");
    dialogContainer.className = "error-modal-container";
    dialogContainer.style.display = "flex";
    const dialogContent = document.createElement("div");
    dialogContent.className = "error-modal-content";
    const modalHeader = document.createElement("div");
    modalHeader.className = "error-modal-header";
    const title = document.createElement("h3");
    title.textContent = `${errorCount}件のエラーが見つかりました`;
    title.className = "error-modal-title";
    const closeIcon = document.createElement("span");
    closeIcon.innerHTML = "×";
    closeIcon.title = "閉じる（キャンセル）";
    closeIcon.className = "error-modal-close";
    modalHeader.appendChild(title);
    modalHeader.appendChild(closeIcon);
    const errorDisplay = document.createElement("pre");
    errorDisplay.textContent = errorDetails;
    errorDisplay.className = "error-modal-error-list";
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "error-modal-button-container";
    const continueButton = document.createElement("button");
    continueButton.textContent = "そのまま読み込む";
    continueButton.className = "error-modal-button error-modal-continue-button";
    const cancelButton = document.createElement("button");
    cancelButton.textContent = "キャンセル";
    cancelButton.className = "error-modal-button error-modal-cancel-button";
    buttonContainer.appendChild(continueButton);
    buttonContainer.appendChild(cancelButton);
    dialogContent.appendChild(modalHeader);
    dialogContent.appendChild(errorDisplay);
    dialogContent.appendChild(buttonContainer);
    dialogContainer.appendChild(dialogContent);

    const closeModal = (shouldProceed) => {
      if (document.body.contains(dialogContainer)) {
        document.body.removeChild(dialogContainer);
      }
      resolve(shouldProceed);
    };
    continueButton.onclick = () => closeModal(true);
    cancelButton.onclick = () => closeModal(false);
    closeIcon.onclick = () => closeModal(false);
    try {
      document.body.appendChild(dialogContainer);
    } catch (appendError) {
      console.error(
        "[UI Upload:displayErrorsToUser] Modal append error:",
        appendError
      );
      alert("エラー表示ウィンドウの生成に失敗しました: " + appendError.message);
      resolve(false);
    }
  });
}

export function resetUploadUI() {
  if (fileUploadInput) fileUploadInput.value = "";
  if (processedFilesList) processedFilesList.innerHTML = "";
  if (uploadedFilesArea) {
    uploadedFilesArea.style.display = "none";
    const headerElement = uploadedFilesArea.querySelector(
      "h4.processed-files-header"
    );
    if (headerElement) headerElement.textContent = "読み込まれたデータ:";
  }
  updateFileList();
  updateUploadStatus("", "");
  if (uploadStatusContainer) uploadStatusContainer.style.display = "none";
  if (selectedFilesDisplay) {
    selectedFilesDisplay.innerHTML = "";
    selectedFilesDisplay.classList.remove("error-display", "info-display");
    selectedFilesDisplay.style.display = "none";
  }
  updateButtonStates("cleared");
  if (fileSelectLabel) {
  }
  if (fileUploadInput) fileUploadInput.disabled = false;
}

export function displayProcessedFiles(filesToProcess, processedHeaderContent) {
  if (uploadedFilesArea && processedFilesList) {
    const headerElement = uploadedFilesArea.querySelector(
      "h4.processed-files-header"
    );
    if (headerElement) headerElement.textContent = processedHeaderContent;
    processedFilesList.innerHTML = "";
    const fragment = document.createDocumentFragment();
    filesToProcess.forEach((file) => {
      const listItem = document.createElement("li");
      listItem.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(
        2
      )} MB)`;
      listItem.title = file.name;
      fragment.appendChild(listItem);
    });
    processedFilesList.appendChild(fragment);
    uploadedFilesArea.style.display = "block";
  }
}

export function clearSelectedFilesDisplayArea() {
  if (selectedFilesDisplay) {
    selectedFilesDisplay.innerHTML = "";
    selectedFilesDisplay.style.display = "none";
    selectedFilesDisplay.classList.remove("error-display", "info-display");
  }
}

export function showErrorMessageInFilesDisplay(htmlContent) {
  if (selectedFilesDisplay) {
    selectedFilesDisplay.innerHTML = htmlContent;
    selectedFilesDisplay.classList.add("error-display");
    selectedFilesDisplay.style.display = "block";
  }
}
