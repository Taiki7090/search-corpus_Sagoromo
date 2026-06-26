export function isValidValue(value) {
  return (
    value !== undefined &&
    value !== null &&
    value !== "" &&
    value !== "NaN" &&
    !(typeof value === "number" && isNaN(value))
  );
}

export function setupCopyButton(container) {
  if (!container || container.classList.contains("has-copy-button")) return;
  container.querySelector(".copy-conditions-button")?.remove();
  container.querySelector(".copy-feedback")?.remove();
  const copyButton = document.createElement("button");
  copyButton.className = "copy-conditions-button";
  copyButton.innerHTML = "📄";
  copyButton.title = "検索条件をコピー";

  const feedback = document.createElement("span");
  feedback.className = "copy-feedback";
  feedback.textContent = "コピーしました";

  copyButton.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    const conditionsTextElement = container.querySelector(
      ".search-conditions-display"
    );

    if (conditionsTextElement && navigator.clipboard) {
      navigator.clipboard
        .writeText(conditionsTextElement.textContent || "")
        .then(() => {
          feedback.classList.add("show");
          copyButton.innerHTML = "✓";
          copyButton.classList.add("copy-button-success");

          setTimeout(() => {
            feedback.classList.remove("show");
            copyButton.innerHTML = "📄";
            copyButton.classList.remove("copy-button-success");
          }, 1000);
        })
        .catch((err) => {
          console.error("コピー失敗:", err);
          alert("コピー失敗: " + err.message);
          copyButton.innerHTML = "📄";
          copyButton.classList.remove("copy-button-success");
          feedback.classList.remove("show");
        });
    } else if (!navigator.clipboard) {
      alert("クリップボード機能非対応");
    } else {
      alert("コピー対象テキスト未発見");
    }
  });

  const toggleButton = container.querySelector(".toggle-conditions-button");
  const title = container.querySelector(".search-conditions-title");
  let placementTarget = toggleButton || title;

  if (placementTarget && placementTarget.parentNode) {
    placementTarget.parentNode.insertBefore(copyButton, placementTarget);
    copyButton.after(feedback);
  } else {
    console.warn(
      "Could not find suitable placement target for copy button, appending to container end."
    );
    container.appendChild(copyButton);
    container.appendChild(feedback);
  }
  container.classList.add("has-copy-button");
}

export function setupCopyButtonAndObserver() {
  try {
    document
      .querySelectorAll(".search-conditions-container")
      .forEach((container) => {
        if (
          !container.querySelector(".copy-conditions-button") &&
          container.id !== "string-search-options"
        ) {
          if (typeof setupCopyButton === "function") setupCopyButton(container);
        }
      });
    const observerTarget = document.body;
    const observerOptions = { childList: true, subtree: true };
    const searchConditionsObserver = new MutationObserver(function (
      mutationsList,
      _observer
    ) {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (
                node.matches &&
                node.matches(".search-conditions-container") &&
                node.id !== "string-search-options" &&
                !node.querySelector(".copy-conditions-button")
              ) {
                if (typeof setupCopyButton === "function")
                  setupCopyButton(node);
              }
              node
                .querySelectorAll(".search-conditions-container")
                .forEach((container) => {
                  if (
                    container.id !== "string-search-options" &&
                    !container.querySelector(".copy-conditions-button")
                  ) {
                    if (typeof setupCopyButton === "function")
                      setupCopyButton(container);
                  }
                });
            }
          });
        }
      }
    });
    searchConditionsObserver.observe(observerTarget, observerOptions);
  } catch (error) {
    console.error(
      "[ui.js] Error setting up copy buttons or MutationObserver:",
      error
    );
  }
}
