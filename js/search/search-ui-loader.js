export function showLoading(show, message = "処理中...", type = "search") {
  const standardLoading = document.getElementById("loading-indicator");
  let conditionLoading = document.getElementById("condition-loading-overlay");

  if (type === "condition" && !conditionLoading && show) {
    conditionLoading = createConditionLoadingOverlay();
  }

  if (type === "search" && standardLoading) {
    if (show) {
      standardLoading.style.display = "flex";
      const loadingText = standardLoading.querySelector(".loading-text");
      if (loadingText) {
        loadingText.textContent = message;
      }
      document.body.style.overflow = "hidden";
      const unitSearchBtn = document.getElementById("unit-search-button");
      const stringSearchBtn = document.getElementById("string-search-button");
      if (unitSearchBtn) unitSearchBtn.disabled = true;
      if (stringSearchBtn) stringSearchBtn.disabled = true;
    } else {
      standardLoading.style.display = "none";
      document.body.style.overflow = "";
    }
  } else if (type === "search" && !standardLoading) {
    console.warn(
      "[showLoading] Loading indicator element ('loading-indicator') not found."
    );
  } else if (type === "condition" && conditionLoading) {
    if (show) {
      conditionLoading.style.display = "flex";
      document.body.style.overflow = "hidden";
      const loadingText = conditionLoading.querySelector(".loading-text");
      if (loadingText) loadingText.textContent = message;
    } else {
      conditionLoading.style.display = "none";
      document.body.style.overflow = "";
    }
  } else if (type === "condition" && !conditionLoading && !show) {
  } else {
    console.warn(
      `[showLoading] Unexpected combination: type=${type}, show=${show}, standardLoading=${!!standardLoading}, conditionLoading=${!!conditionLoading}`
    );
  }
}

export function showLoadingOverlay(show, message = "処理中...") {
  let loadingOverlay = document.getElementById("condition-loading-overlay");

  if (show) {
    if (!loadingOverlay) {
      loadingOverlay = document.createElement("div");
      loadingOverlay.id = "condition-loading-overlay";
      loadingOverlay.className = "loading";
      loadingOverlay.style.display = "flex";

      const spinnerContainer = document.createElement("div");
      spinnerContainer.className = "spinner-container";

      const spinner = document.createElement("div");
      spinner.className = "spinner";

      const loadingText = document.createElement("div");
      loadingText.className = "loading-text";
      loadingText.textContent = message;

      spinnerContainer.appendChild(spinner);
      spinnerContainer.appendChild(loadingText);
      loadingOverlay.appendChild(spinnerContainer);

      document.body.appendChild(loadingOverlay);
    } else {
      loadingOverlay.style.display = "flex";
      const loadingText = loadingOverlay.querySelector(".loading-text");
      if (loadingText) {
        loadingText.textContent = message;
      }
    }
  } else {
    if (loadingOverlay) {
      loadingOverlay.style.display = "none";
    }
  }
}

function createConditionLoadingOverlay() {
  const loadingOverlay = document.createElement("div");
  loadingOverlay.id = "condition-loading-overlay";
  loadingOverlay.className = "loading";
  loadingOverlay.style.display = "flex";
  loadingOverlay.style.zIndex = "2000";

  const spinnerContainer = document.createElement("div");
  spinnerContainer.className = "spinner-container";

  const spinner = document.createElement("div");
  spinner.className = "spinner";

  const loadingText = document.createElement("div");
  loadingText.className = "loading-text";
  loadingText.textContent = "検索条件を適用中...";

  spinnerContainer.appendChild(spinner);
  spinnerContainer.appendChild(loadingText);
  loadingOverlay.appendChild(spinnerContainer);

  document.body.appendChild(loadingOverlay);

  return loadingOverlay;
}
