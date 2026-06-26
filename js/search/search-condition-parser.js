import { showLoadingOverlay } from "./search-ui-loader.js";
import { clearAllConditions } from "./search-conditions-common.js";
let currentModalOverlay = null;
let currentModalContainer = null;
let currentModalKeyDownListener = null;
let currentModalOverlayClickListener = null;

export function showSearchConditionInputModal() {
  if (currentModalContainer) {
    console.warn(
      "Modal already exists. Closing previous one before opening new."
    );
    hideSearchConditionInputModalInternal();
  }

  const modalOverlay = document.createElement("div");
  modalOverlay.id = "search-condition-input-modal-overlay";
  modalOverlay.className = "modal-overlay";
  currentModalOverlay = modalOverlay;

  const modalContainer = document.createElement("div");
  modalContainer.id = "search-condition-input-modal";
  modalContainer.className = "modal-container";
  currentModalContainer = modalContainer;

  const modalHeader = document.createElement("div");
  modalHeader.className = "modal-header";
  const modalTitle = document.createElement("h3");
  modalTitle.textContent = "検索条件を入力";
  const closeButton = document.createElement("button");
  closeButton.className = "modal-close-button";
  closeButton.innerHTML = "×";
  closeButton.addEventListener("click", hideSearchConditionInputModalInternal);
  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeButton);

  const modalContent = document.createElement("div");
  modalContent.className = "modal-content";
  const exampleSection = document.createElement("div");
  exampleSection.className = "example-section";
  const exampleTitle = document.createElement("p");
  exampleTitle.className = "example-title";
  exampleTitle.textContent = "使用例：";
  exampleSection.appendChild(exampleTitle);
  const exampleCode = document.createElement("pre");
  exampleCode.className = "example-code";
  exampleCode.textContent =
    'キー: 品詞 LIKE "名詞%"\n' +
    'AND 前方共起: 書字形出現形="先生" WITHIN 10 WORDS FROM キー\n' +
    'AND 後方共起: (語彙素="為る" AND 書字形出現形="する") ON 1 WORDS FROM キー';
  exampleSection.appendChild(exampleCode);
  modalContent.appendChild(exampleSection);
  const textArea = document.createElement("textarea");
  textArea.id = "search-condition-input-textarea";
  textArea.placeholder =
    "ここに検索条件式を入力またはペーストしてください（括弧がネストされた式には対応していません）。";
  textArea.rows = 8;
  modalContent.appendChild(textArea);
  const errorArea = document.createElement("div");
  errorArea.id = "search-condition-input-error";
  errorArea.className = "modal-error";
  modalContent.appendChild(errorArea);

  const modalFooter = document.createElement("div");
  modalFooter.className = "modal-footer";
  const applyButton = document.createElement("button");
  applyButton.textContent = "適用";
  applyButton.className = "modal-apply-button";
  applyButton.addEventListener("click", () => {
    const conditionsText = textArea.value;
    errorArea.style.display = "none";
    showLoadingOverlay(true, "検索条件を適用中...");
    setTimeout(() => {
      try {
        const result = parseSearchConditionsText(conditionsText);
        if (result.success) {
          hideSearchConditionInputModalInternal();
          setTimeout(() => {
            const statusVar =
              document.querySelector(".status-var") ||
              document.getElementById("result-stats") ||
              document.getElementById("unit-result-stats");
            if (statusVar) {
              const originalText = statusVar.textContent || "";
              statusVar.textContent = "検索条件を適用しました";
              setTimeout(() => {
                statusVar.textContent = originalText;
              }, 3000);
            }
          }, 1000);
        } else {
          errorArea.textContent = result.message;
          errorArea.style.display = "block";
          showLoadingOverlay(false);
        }
      } catch (error) {
        console.error("検索条件の解析に失敗しました:", error);
        errorArea.textContent =
          "検索条件の解析中にエラーが発生しました: " + error.message;
        errorArea.style.display = "block";
        showLoadingOverlay(false);
      }
    }, 100);
  });
  const cancelButton = document.createElement("button");
  cancelButton.textContent = "キャンセル";
  cancelButton.className = "modal-cancel-button";
  cancelButton.addEventListener("click", hideSearchConditionInputModalInternal);
  modalFooter.appendChild(applyButton);
  modalFooter.appendChild(cancelButton);

  modalContainer.appendChild(modalHeader);
  modalContainer.appendChild(modalContent);
  modalContainer.appendChild(modalFooter);

  document.body.appendChild(modalOverlay);
  document.body.appendChild(modalContainer);

  modalOverlay.style.display = "flex";
  modalContainer.style.display = "flex";

  setTimeout(() => {
    textArea.focus();
  }, 100);

  currentModalKeyDownListener = function handleKeyDown(e) {
    if (e.key === "Escape") {
      hideSearchConditionInputModalInternal();
    }
  };
  document.addEventListener("keydown", currentModalKeyDownListener);

  currentModalOverlayClickListener = function () {
    hideSearchConditionInputModalInternal();
  };
  modalOverlay.addEventListener("click", currentModalOverlayClickListener);
}

function parseSearchConditionsText(conditionsText) {
  try {
    clearAllConditions();

    const result = {
      keyCondition: null,
      preContextConditions: [],
      postContextConditions: [],
      success: false,
      message: "",
    };

    if (!conditionsText || conditionsText.trim() === "") {
      result.message = "検索条件が入力されていません";
      return result;
    }

    const lines = conditionsText.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (i === 0 && line.startsWith("キー:")) {
        const keyConditionText = line.substring("キー:".length).trim();
        result.keyCondition = parseCondition(keyConditionText, "key");
        if (!result.keyCondition) {
          result.message = "キー条件の解析に失敗しました: " + keyConditionText;
          return result;
        }
      } else if (line.includes("前方共起:")) {
        const conditionText = line
          .substring(line.indexOf("前方共起:") + "前方共起:".length)
          .trim();
        const preCondition = parseContextCondition(conditionText, "pre");
        if (preCondition) {
          result.preContextConditions.push(preCondition);
        } else {
          result.message = "前方共起条件の解析に失敗しました: " + conditionText;
          return result;
        }
      } else if (line.includes("後方共起:")) {
        const conditionText = line
          .substring(line.indexOf("後方共起:") + "後方共起:".length)
          .trim();
        const postCondition = parseContextCondition(conditionText, "post");
        if (postCondition) {
          result.postContextConditions.push(postCondition);
        } else {
          result.message = "後方共起条件の解析に失敗しました: " + conditionText;
          return result;
        }
      }
    }

    if (!result.keyCondition) {
      result.message = "キー条件が見つかりませんでした";
      return result;
    }

    result.success = true;
    result.message = "検索条件の解析に成功しました";

    applyConditionsToUI(result);

    return result;
  } catch (error) {
    console.error("検索条件解析エラー:", error);
    return {
      keyCondition: null,
      preContextConditions: [],
      postContextConditions: [],
      success: false,
      message: "エラーが発生しました: " + error.message,
    };
  }
}

function parseCondition(conditionText, conditionType) {
  try {
    const isCompound =
      conditionText.startsWith("(") && conditionText.endsWith(")");

    if (isCompound) {
      const innerText = conditionText.substring(1, conditionText.length - 1);
      return parseCompoundCondition(innerText, conditionType);
    }

    return parseSingleCondition(conditionText, conditionType);
  } catch (error) {
    console.error("条件解析エラー:", error, conditionText);
    return null;
  }
}

function parseCompoundCondition(conditionText, conditionType) {
  const parts = conditionText.split(/\s+(AND\s+NOT|AND|OR)\s+/);

  const mainCondition = parseSingleCondition(parts[0], conditionType);
  if (!mainCondition) return null;

  mainCondition.shortUnitConditions = [];

  for (let i = 1; i < parts.length; i += 2) {
    if (i + 1 >= parts.length) break;

    const logic = parts[i];
    const conditionPart = parts[i + 1];

    const subCondition = parseSingleCondition(conditionPart, "shortUnit");
    if (subCondition) {
      subCondition.logic = logic === "AND NOT" ? "NOT" : logic;
      mainCondition.shortUnitConditions.push(subCondition);
    }
  }
  return mainCondition;
}

function parseSingleCondition(conditionText, conditionType) {
  const equalPattern = /([^=]+)="([^"]*)"/;
  const likePattern = /([^L]+) LIKE "([^"]*%?)"/;

  let matches;
  let type, value;

  if ((matches = equalPattern.exec(conditionText)) !== null) {
    type = matches[1].trim();
    value = matches[2];
  } else if ((matches = likePattern.exec(conditionText)) !== null) {
    type = matches[1].trim();
    value = matches[2];
  }

  return { type, value, conditionType };
}

function parseContextCondition(conditionText, contextType) {
  try {
    const parts = conditionText.split(/\s+(WITHIN|ON)\s+/);
    if (parts.length < 3) {
      console.error("共起条件のフォーマットが不正です:", conditionText);
      return null;
    }

    const condition = parseCondition(parts[0], contextType);
    if (!condition) return null;

    const rangeType = parts[1];
    const rangeParts = parts[2].split(/\s+WORDS\s+FROM\s+キー/);
    if (rangeParts.length < 1) {
      console.error("範囲指定のフォーマットが不正です:", parts[2]);
      return null;
    }

    const range = parseInt(rangeParts[0].trim(), 10);
    if (isNaN(range)) {
      console.error("範囲値が数値ではありません:", rangeParts[0]);
      return null;
    }

    condition.range = range.toString();
    condition.unit = rangeType === "WITHIN" ? "語以内" : "語";

    return condition;
  } catch (error) {
    console.error("共起条件解析エラー:", error, conditionText);
    return null;
  }
}

function applyConditionsToUI(result) {
  try {
    showLoadingOverlay(true, "検索条件を適用中...");

    setTimeout(async () => {
      try {
        if (result.keyCondition) {
          await applyKeyCondition(result.keyCondition);
        }

        for (let i = result.preContextConditions.length - 1; i >= 0; i--) {
          await applyContextCondition(result.preContextConditions[i], "pre");
        }

        for (let i = 0; i < result.postContextConditions.length; i++) {
          await applyContextCondition(result.postContextConditions[i], "post");
        }

        showLoadingOverlay(false);
      } catch (error) {
        console.error("UI適用エラー:", error);
        showLoadingOverlay(false);
        throw error;
      }
    }, 50);
  } catch (error) {
    console.error("UI適用エラー:", error);
    showLoadingOverlay(false);
    throw error;
  }
}

function applyKeyCondition(condition) {
  return new Promise((resolve, _reject) => {
    try {
      const keyCondition = document.querySelector(
        '.search-condition[data-is-key="true"]'
      );
      if (!keyCondition) {
        console.error("キー条件要素が見つかりません");
        return resolve();
      }

      const typeSelect = keyCondition.querySelector(".condition-type");
      if (typeSelect) {
        typeSelect.value = condition.type;
        typeSelect.dispatchEvent(new Event("change"));
      }

      setTimeout(() => {
        const inputContainer = keyCondition.querySelector(
          ".search-condition-input"
        );
        if (inputContainer) {
          if (
            condition.type === "品詞" ||
            condition.type === "活用型" ||
            condition.type === "活用形"
          ) {
            const selectField = inputContainer.querySelector(
              "select.condition-value"
            );
            if (selectField) {
              const isLikePattern =
                condition.value && condition.value.includes("%");

              if (isLikePattern) {
                const baseValue = condition.value.replace(/%$/, "");
                selectField.value = baseValue;
                selectField.setAttribute("data-value", condition.value);
              } else {
                selectField.value = condition.value;
                selectField.setAttribute("data-value", `${condition.value}%`);
              }

              selectField.dispatchEvent(new Event("change"));
            }
          } else {
            const inputField = inputContainer.querySelector(
              "input.condition-value"
            );
            if (inputField) {
              inputField.value = condition.value;
            }
          }
        }

        if (
          condition.shortUnitConditions &&
          condition.shortUnitConditions.length > 0
        ) {
          applyShortUnitConditionsPromise(
            keyCondition,
            condition.shortUnitConditions
          )
            .then(() => {
              resolve();
            })
            .catch((err) => {
              console.error("短単位条件適用エラー:", err);
              resolve();
            });
        } else {
          resolve();
        }
      }, 100);
    } catch (error) {
      console.error("キー条件適用エラー:", error);
      resolve();
    }
  });
}

function applyContextCondition(condition, contextType) {
  return new Promise((resolve, _reject) => {
    try {
      const addButton = document.getElementById(
        `add-${contextType}-context-button`
      );
      if (!addButton) {
        console.error(`${contextType}方共起条件追加ボタンが見つかりません`);
        return resolve();
      }

      addButton.click();

      setTimeout(() => {
        let conditionElement;
        const container = document.getElementById(
          `${contextType}-context-conditions`
        );
        if (!container) {
          console.error(`${contextType}方共起条件コンテナが見つかりません`);
          return resolve();
        }

        if (contextType === "pre") {
          conditionElement = container.querySelector(
            ".search-condition:first-child"
          );
        } else {
          conditionElement = container.querySelector(
            ".search-condition:last-child"
          );
        }

        if (!conditionElement) {
          console.error(`${contextType}方共起条件要素が見つかりません`);
          return resolve();
        }

        const rangeSelect = conditionElement.querySelector(
          ".context-width-select"
        );
        const unitSelect = conditionElement.querySelector(
          ".context-unit-select"
        );

        if (rangeSelect) rangeSelect.value = condition.range || "1";
        if (unitSelect) unitSelect.value = condition.unit || "語";

        const typeSelect = conditionElement.querySelector(".condition-type");
        if (typeSelect) {
          typeSelect.value = condition.type;
          typeSelect.dispatchEvent(new Event("change"));
        }

        setTimeout(() => {
          const inputContainer = conditionElement.querySelector(
            ".search-condition-input"
          );
          if (inputContainer) {
            if (
              condition.type === "品詞" ||
              condition.type === "活用型" ||
              condition.type === "活用形"
            ) {
              const selectField = inputContainer.querySelector(
                "select.condition-value"
              );
              if (selectField) {
                const isLikePattern =
                  condition.value && condition.value.includes("%");

                if (isLikePattern) {
                  const baseValue = condition.value.replace(/%$/, "");
                  selectField.value = baseValue;
                  selectField.setAttribute("data-value", condition.value);
                } else {
                  selectField.value = condition.value;
                  selectField.setAttribute("data-value", `${condition.value}%`);
                }

                selectField.dispatchEvent(new Event("change"));
              }
            } else {
              const inputField = inputContainer.querySelector(
                "input.condition-value"
              );
              if (inputField) {
                inputField.value = condition.value;
              }
            }
          }

          if (
            condition.shortUnitConditions &&
            condition.shortUnitConditions.length > 0
          ) {
            applyShortUnitConditionsPromise(
              conditionElement,
              condition.shortUnitConditions
            )
              .then(() => {
                resolve();
              })
              .catch((err) => {
                console.error("短単位条件適用エラー:", err);
                resolve();
              });
          } else {
            resolve();
          }
        }, 200);
      }, 200);
    } catch (error) {
      console.error(`${contextType}方共起条件の適用エラー:`, error);
      resolve();
    }
  });
}

function applyShortUnitConditionsPromise(parentCondition, shortUnitConditions) {
  return new Promise((resolve, _reject) => {
    try {
      setTimeout(() => {
        const addButton = parentCondition.querySelector(
          ".add-short-unit-button"
        );
        if (addButton) {
          applyShortUnitConditionsSequentially(
            parentCondition,
            shortUnitConditions
          )
            .then(() => {
              resolve();
            })
            .catch((error) => {
              console.error("短単位条件の適用中にエラー:", error);
              resolve();
            });
        } else {
          console.warn("短単位条件追加ボタンが見つかりません");
          resolve();
        }
      }, 300);
    } catch (error) {
      console.error(
        "短単位条件の適用エラー:",
        error,
        parentCondition,
        shortUnitConditions
      );
      resolve();
    }
  });
}

function applyShortUnitConditionsSequentially(parentCondition, conditions) {
  if (!conditions || conditions.length === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    try {
      const conditionId = parentCondition.dataset.conditionId;
      if (!conditionId) {
        console.error("親条件にID属性がありません");
        return resolve();
      }

      const addButton =
        parentCondition.querySelector(".add-short-unit-button") ||
        document.querySelector(
          `#short-unit-container-${conditionId} .add-short-unit-button`
        );

      if (!addButton) {
        console.error("短単位条件追加ボタンが見つかりません");
        return resolve();
      }

      const firstCondition = conditions[0];
      const remainingConditions = conditions.slice(1);

      addButton.click();

      setTimeout(() => {
        const container = document.getElementById(
          `short-unit-container-${conditionId}`
        );
        if (!container) {
          console.error("短単位条件コンテナが見つかりません");
          return resolve();
        }

        const elements = container.querySelectorAll(".short-unit-condition");
        const lastElement = elements[elements.length - 1];

        if (!lastElement) {
          console.error("短単位条件要素が見つかりません");
          return resolve();
        }

        const logicSelect = lastElement.querySelector(
          ".short-unit-condition-logic"
        );
        if (logicSelect) {
          if (firstCondition.logic === "NOT") {
            logicSelect.value = "NOT";
          } else {
            logicSelect.value = firstCondition.logic || "AND";
          }
        }

        const typeSelect = lastElement.querySelector(
          ".short-unit-condition-type"
        );
        if (typeSelect) {
          typeSelect.value = firstCondition.type;
          typeSelect.dispatchEvent(new Event("change"));
        }

        setTimeout(() => {
          const inputContainer = lastElement.querySelector(
            ".short-unit-condition-input"
          );
          if (inputContainer) {
            if (
              firstCondition.type === "品詞" ||
              firstCondition.type === "活用型" ||
              firstCondition.type === "活用形"
            ) {
              const selectField = inputContainer.querySelector(
                "select.condition-value"
              );
              if (selectField) {
                const isLikePattern =
                  firstCondition.value && firstCondition.value.includes("%");

                if (isLikePattern) {
                  const baseValue = firstCondition.value.replace(/%$/, "");
                  selectField.value = baseValue;
                  selectField.setAttribute("data-value", firstCondition.value);
                } else {
                  selectField.value = firstCondition.value;
                  if (
                    firstCondition.type === "品詞" ||
                    firstCondition.type === "活用型" ||
                    firstCondition.type === "活用形"
                  ) {
                    selectField.setAttribute(
                      "data-value",
                      `${firstCondition.value}%`
                    );
                  } else {
                    selectField.setAttribute(
                      "data-value",
                      firstCondition.value
                    );
                  }
                }

                selectField.dispatchEvent(new Event("change"));
              }
            } else {
              const inputField = inputContainer.querySelector(
                "input.condition-value"
              );
              if (inputField) {
                inputField.value = firstCondition.value;
              }
            }
          }

          if (remainingConditions.length > 0) {
            setTimeout(() => {
              applyShortUnitConditionsSequentially(
                parentCondition,
                remainingConditions
              )
                .then(resolve)
                .catch(reject);
            }, 150);
          } else {
            resolve();
          }
        }, 150);
      }, 150);
    } catch (error) {
      console.error("短単位条件の順次適用エラー:", error);
      resolve();
    }
  });
}

function hideSearchConditionInputModalInternal() {
  if (currentModalOverlay && document.body.contains(currentModalOverlay)) {
    document.body.removeChild(currentModalOverlay);
  }
  if (currentModalContainer && document.body.contains(currentModalContainer)) {
    document.body.removeChild(currentModalContainer);
  }

  if (currentModalKeyDownListener) {
    document.removeEventListener("keydown", currentModalKeyDownListener);
  }
  if (currentModalOverlay && currentModalOverlayClickListener) {
    currentModalOverlay.removeEventListener(
      "click",
      currentModalOverlayClickListener
    );
  }

  currentModalOverlay = null;
  currentModalContainer = null;
  currentModalKeyDownListener = null;
  currentModalOverlayClickListener = null;
}
