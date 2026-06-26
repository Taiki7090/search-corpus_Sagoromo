export function validateSearchConditions() {
  const errors = [];

  const keyElement = document.querySelector(
    '.search-condition[data-is-key="true"]'
  );
  if (!keyElement) {
    errors.push("キー条件が見つかりません。");
  } else {
    const keyTypeSelect = keyElement.querySelector(".condition-type");
    const keyType = keyTypeSelect ? keyTypeSelect.value : "";
    const keyInputContainer = keyElement.querySelector(
      ".search-condition-input"
    );
    let keyValue = "";

    if (!keyInputContainer) {
      errors.push("キー条件の入力欄が見つかりません。");
    } else {
      if (keyType === "品詞" || keyType === "活用型" || keyType === "活用形") {
        const selectElement = keyInputContainer.querySelector(
          "select.condition-value"
        );
        if (selectElement) {
          keyValue = selectElement.dataset.value || selectElement.value || "";
          if (!keyValue) {
            errors.push(`キー条件の「${keyType}」が選択されていません。`);
          }
        } else {
          errors.push(`キー条件の入力項目（プルダウン）が見つかりません。`);
        }
      } else {
        const inputElement = keyInputContainer.querySelector(
          "input.condition-value"
        );
        if (inputElement) {
          keyValue = inputElement.value.trim();
          if (!keyValue) {
            errors.push(`キー条件の「${keyType}」が入力されていません。`);
          }
        } else {
          errors.push(`キー条件の入力項目（テキスト）が見つかりません。`);
        }
      }
    }

    if (keyElement.dataset.conditionId) {
      const shortUnitContainer = document.getElementById(
        "short-unit-container-" + keyElement.dataset.conditionId
      );
      if (shortUnitContainer) {
        const shortUnitResult = validateShortUnitConditions(
          shortUnitContainer,
          "キー"
        );
        if (!shortUnitResult.isValid) {
          errors.push(...shortUnitResult.errors);
        }
      }
    }
  }

  const preContextElements = document.querySelectorAll(
    "#pre-context-conditions .search-condition"
  );
  preContextElements.forEach((element, i) => {
    const conditionType = element.querySelector(".condition-type")?.value;
    const inputContainer = element.querySelector(".search-condition-input");
    if (!inputContainer || !conditionType) {
      errors.push(`前方共起条件${i + 1}の要素が不完全です。`);
      return;
    }
    let conditionValue = "";
    if (
      conditionType === "品詞" ||
      conditionType === "活用型" ||
      conditionType === "活用形"
    ) {
      const selectElement = inputContainer.querySelector(
        "select.condition-value"
      );
      if (selectElement) {
        conditionValue =
          selectElement.dataset.value || selectElement.value || "";
        if (!conditionValue) {
          errors.push(
            `前方共起条件${i + 1}の「${conditionType}」が選択されていません。`
          );
        }
      } else {
        errors.push(
          `前方共起条件${i + 1}の入力項目（プルダウン）が見つかりません。`
        );
      }
    } else {
      const inputElement = inputContainer.querySelector(
        "input.condition-value"
      );
      if (inputElement) {
        conditionValue = inputElement.value.trim();
        if (!conditionValue) {
          errors.push(
            `前方共起条件${i + 1}の「${conditionType}」が入力されていません。`
          );
        }
      } else {
        errors.push(
          `前方共起条件${i + 1}の入力項目（テキスト）が見つかりません。`
        );
      }
    }

    if (element.dataset.conditionId) {
      const shortUnitContainer = document.getElementById(
        "short-unit-container-" + element.dataset.conditionId
      );
      if (shortUnitContainer) {
        const shortUnitResult = validateShortUnitConditions(
          shortUnitContainer,
          `前方共起${i + 1}`
        );
        if (!shortUnitResult.isValid) {
          errors.push(...shortUnitResult.errors);
        }
      }
    }
  });

  const postContextElements = document.querySelectorAll(
    "#post-context-conditions .search-condition"
  );
  postContextElements.forEach((element, i) => {
    const conditionType = element.querySelector(".condition-type")?.value;
    const inputContainer = element.querySelector(".search-condition-input");
    if (!inputContainer || !conditionType) {
      errors.push(`後方共起条件${i + 1}の要素が不完全です。`);
      return;
    }
    let conditionValue = "";
    if (
      conditionType === "品詞" ||
      conditionType === "活用型" ||
      conditionType === "活用形"
    ) {
      const selectElement = inputContainer.querySelector(
        "select.condition-value"
      );
      if (selectElement) {
        conditionValue =
          selectElement.dataset.value || selectElement.value || "";
        if (!conditionValue) {
          errors.push(
            `後方共起条件${i + 1}の「${conditionType}」が選択されていません。`
          );
        }
      } else {
        errors.push(
          `後方共起条件${i + 1}の入力項目（プルダウン）が見つかりません。`
        );
      }
    } else {
      const inputElement = inputContainer.querySelector(
        "input.condition-value"
      );
      if (inputElement) {
        conditionValue = inputElement.value.trim();
        if (!conditionValue) {
          errors.push(
            `後方共起条件${i + 1}の「${conditionType}」が入力されていません。`
          );
        }
      } else {
        errors.push(
          `後方共起条件${i + 1}の入力項目（テキスト）が見つかりません。`
        );
      }
    }

    if (element.dataset.conditionId) {
      const shortUnitContainer = document.getElementById(
        "short-unit-container-" + element.dataset.conditionId
      );
      if (shortUnitContainer) {
        const shortUnitResult = validateShortUnitConditions(
          shortUnitContainer,
          `後方共起${i + 1}`
        );
        if (!shortUnitResult.isValid) {
          errors.push(...shortUnitResult.errors);
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

export function validateShortUnitConditions(container, parentName) {
  const errors = [];

  const shortUnitElements = container.querySelectorAll(".short-unit-condition");
  shortUnitElements.forEach((element, i) => {
    const logic =
      element.querySelector(".short-unit-condition-logic")?.value || "不明";
    const conditionType = element.querySelector(
      ".short-unit-condition-type"
    )?.value;
    const inputContainer = element.querySelector(".short-unit-condition-input");

    if (!inputContainer || !conditionType) {
      errors.push(
        `${parentName} > 短単位条件${i + 1}(${logic})の要素が不完全です。`
      );
      return;
    }

    let conditionValue = "";
    if (
      conditionType === "品詞" ||
      conditionType === "活用型" ||
      conditionType === "活用形"
    ) {
      const selectElement = inputContainer.querySelector(
        "select.condition-value"
      );
      if (selectElement) {
        conditionValue =
          selectElement.dataset.value || selectElement.value || "";
        if (!conditionValue) {
          errors.push(
            `${parentName} > 短単位条件${
              i + 1
            }(${logic})の「${conditionType}」が選択されていません。`
          );
        }
      } else {
        errors.push(
          `${parentName} > 短単位条件${
            i + 1
          }(${logic})の入力項目（プルダウン）が見つかりません。`
        );
      }
    } else {
      const inputElement = inputContainer.querySelector(
        "input.condition-value"
      );
      if (inputElement) {
        conditionValue = inputElement.value.trim();
        if (!conditionValue) {
          errors.push(
            `${parentName} > 短単位条件${
              i + 1
            }(${logic})の「${conditionType}」が入力されていません。`
          );
        }
      } else {
        errors.push(
          `${parentName} > 短単位条件${
            i + 1
          }(${logic})の入力項目（テキスト）が見つかりません。`
        );
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

export function validateStringSearchInput() {
  const errors = [];
  const queryInput = document.getElementById("search-query");

  const searchMode = document.querySelector(
    'input[name="string-search-mode"]:checked'
  )?.value;
  if (searchMode === "regex" && queryInput && queryInput.value) {
    try {
      new RegExp(queryInput.value);
    } catch (e) {
      errors.push("正規表現が無効です: " + e.message);
    }
  }
  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}
