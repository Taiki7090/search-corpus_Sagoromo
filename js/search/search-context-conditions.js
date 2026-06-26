import {
  matchesCondition,
  getCrossBoundarySetting,
} from "./search-condition-utils.js";
import { addShortUnitCondition } from "./search-short-unit-conditions.js";
import { attachChangeEvent } from "./search-dropdown.js";

export function checkContextConditions(
  tokenId,
  preContextConditions,
  postContextConditions,
  tokens
) {
  if (!tokens)
    return {
      success: false,
      preMatchedTokenIdsPerCondition: [],
      postMatchedTokenIdsPerCondition: [],
    };
  const currentToken = tokens[tokenId];
  if (!currentToken)
    return {
      success: false,
      preMatchedTokenIdsPerCondition: [],
      postMatchedTokenIdsPerCondition: [],
    };
  const crossBoundary = getCrossBoundarySetting();
  const isSameFile = (idx) =>
    idx >= 0 &&
    idx < tokens.length &&
    tokens[idx] &&
    tokens[idx].ファイル名 === currentToken.ファイル名;

  const preMatchedTokenIdsPerCondition = [];
  const postMatchedTokenIdsPerCondition = [];
  let allPreConditionsMet = true;
  let allPostConditionsMet = true;

  if (preContextConditions && preContextConditions.length > 0) {
    for (let i = 0; i < preContextConditions.length; i++) {
      const condition = preContextConditions[i];
      if (!condition || !condition.value || condition.value.trim() === "")
        continue;

      const range = parseInt(condition.range || "1", 10);
      const isWithin = condition.unit === "語以内";
      const matchedTokenIdsForThisCondition = [];

      const startIndex = tokenId - 1;
      const endIndex = isWithin ? tokenId - range : tokenId - range;
      const targetIndex = isWithin ? -1 : tokenId - range;

      if (!crossBoundary && tokens[tokenId].文境界 === "B") {
        allPreConditionsMet = false;
      } else {
        for (let j = startIndex; j >= 0 && j >= endIndex; j--) {
          if (!isWithin && j !== targetIndex) continue;
          if (!isSameFile(j)) break;

          const targetToken = tokens[j];
          if (!targetToken) continue;

          if (!crossBoundary) {
            let boundaryFoundBetweenKeyAndTarget = false;
            for (let k = j + 1; k < tokenId; k++) {
              if (tokens[k] && tokens[k].文境界 === "B") {
                boundaryFoundBetweenKeyAndTarget = true;
                break;
              }
            }
            if (boundaryFoundBetweenKeyAndTarget) {
              if (!isWithin) {
                allPreConditionsMet = false;
              }
              break;
            }
          }

          if (evaluateTokenAgainstCondition(targetToken, condition)) {
            matchedTokenIdsForThisCondition.push(j);
            if (!isWithin) break;
          } else if (!isWithin && j === targetIndex) {
            allPreConditionsMet = false;
          }

          if (!allPreConditionsMet) break;

          if (!crossBoundary && targetToken.文境界 === "B") {
            break;
          }
        }
      }

      if (!allPreConditionsMet) break;

      if (matchedTokenIdsForThisCondition.length === 0 && allPreConditionsMet) {
        allPreConditionsMet = false;
      }
      if (allPreConditionsMet) {
        preMatchedTokenIdsPerCondition.push(
          matchedTokenIdsForThisCondition.reverse()
        );
      }
    }
  }

  if (
    allPreConditionsMet &&
    postContextConditions &&
    postContextConditions.length > 0
  ) {
    for (let i = 0; i < postContextConditions.length; i++) {
      const condition = postContextConditions[i];
      if (!condition || !condition.value || condition.value.trim() === "")
        continue;

      const range = parseInt(condition.range || "1", 10);
      const isWithin = condition.unit === "語以内";
      const matchedTokenIdsForThisCondition = [];

      const startIndex = tokenId + 1;
      const endIndex = isWithin ? tokenId + range : tokenId + range;
      const targetIndex = isWithin ? -1 : tokenId + range;

      for (let j = startIndex; j < tokens.length && j <= endIndex; j++) {
        if (!isWithin && j !== targetIndex) continue;
        if (!isSameFile(j)) break;

        const targetToken = tokens[j];
        if (!targetToken) continue;

        if (!crossBoundary) {
          if (j === tokenId + 1 && targetToken.文境界 === "B") {
            allPostConditionsMet = false;
            break;
          }
          if (targetToken.文境界 === "B") {
            if (!isWithin && j === targetIndex) {
              allPostConditionsMet = false;
            }
            break;
          }
          let boundaryFoundBetweenKeyAndTarget = false;
          for (let k = tokenId + 1; k < j; k++) {
            if (tokens[k] && tokens[k].文境界 === "B") {
              boundaryFoundBetweenKeyAndTarget = true;
              break;
            }
          }
          if (boundaryFoundBetweenKeyAndTarget) {
            if (!isWithin) {
              allPostConditionsMet = false;
            }
            break;
          }
        }

        if (evaluateTokenAgainstCondition(targetToken, condition)) {
          matchedTokenIdsForThisCondition.push(j);
          if (!isWithin) break;
        } else if (!isWithin && j === targetIndex) {
          allPostConditionsMet = false;
        }

        if (!allPostConditionsMet) break;
      }

      if (!allPostConditionsMet) break;

      if (
        matchedTokenIdsForThisCondition.length === 0 &&
        allPostConditionsMet
      ) {
        allPostConditionsMet = false;
      }
      if (allPostConditionsMet) {
        postMatchedTokenIdsPerCondition.push(matchedTokenIdsForThisCondition);
      }
    }
  }

  const success = allPreConditionsMet && allPostConditionsMet;
  return {
    success: success,
    preMatchedTokenIdsPerCondition: success
      ? preMatchedTokenIdsPerCondition
      : [],
    postMatchedTokenIdsPerCondition: success
      ? postMatchedTokenIdsPerCondition
      : [],
  };
}

export function evaluateTokenAgainstCondition(token, condition) {
  const mainConditionOperand = {
    type: condition.type,
    value: condition.value,
    conditionType: condition.conditionType,
  };
  let mainResult = matchesCondition(token, mainConditionOperand);

  if (
    !condition.shortUnitConditions ||
    condition.shortUnitConditions.length === 0
  ) {
    return mainResult;
  }

  // 1. Process NOT operator
  const evaluationPipeline = [{ value: mainResult }];

  for (const suc of condition.shortUnitConditions) {
    const subCond = {
      type: suc.type,
      value: suc.value,
      conditionType: suc.conditionType,
    };
    let subResult = matchesCondition(token, subCond);

    if (suc.logic === "NOT") {
      evaluationPipeline.push({ operator: "AND" });
      evaluationPipeline.push({ value: !subResult });
    } else if (suc.logic === "AND") {
      evaluationPipeline.push({ operator: "AND" });
      evaluationPipeline.push({ value: subResult });
    } else if (suc.logic === "OR") {
      evaluationPipeline.push({ operator: "OR" });
      evaluationPipeline.push({ value: subResult });
    }
  }

  // 2. Process AND operator
  let currentTerms = [...evaluationPipeline];
  let i = 0;
  while (i < currentTerms.length) {
    if (
      i + 2 < currentTerms.length &&
      currentTerms[i].hasOwnProperty("value") &&
      currentTerms[i + 1].operator === "AND" &&
      currentTerms[i + 2].hasOwnProperty("value")
    ) {
      const leftOperand = currentTerms[i].value;
      const rightOperand = currentTerms[i + 2].value;
      const result = leftOperand && rightOperand;
      currentTerms.splice(i, 3, { value: result });
    } else {
      i++;
    }
  }

  // 3. Process OR operator
  let finalResult = currentTerms[0].value;
  i = 1;
  while (i < currentTerms.length) {
    if (
      currentTerms[i].operator === "OR" &&
      i + 1 < currentTerms.length &&
      currentTerms[i + 1].hasOwnProperty("value")
    ) {
      const rightOperand = currentTerms[i + 1].value;
      finalResult = finalResult || rightOperand;
      i += 2;
    } else {
      break;
    }
  }
  return finalResult;
}

export function updateContextCounts() {
  const preContextContainer = document.getElementById("pre-context-conditions");
  const postContextContainer = document.getElementById(
    "post-context-conditions"
  );

  let currentPreContextCount = 0;
  if (preContextContainer) {
    currentPreContextCount =
      preContextContainer.querySelectorAll(".search-condition").length;
  }

  const addPreContextButton = document.getElementById("add-pre-context-button");
  if (addPreContextButton) {
    if (currentPreContextCount >= 5) {
      addPreContextButton.classList.add("disabled");
      addPreContextButton.title = "前方共起条件は最大5つまでです";
      addPreContextButton.disabled = true;
    } else {
      addPreContextButton.classList.remove("disabled");
      addPreContextButton.title = "前方共起条件を追加します（最大5つ）";
      addPreContextButton.disabled = false;
    }
  }

  let currentPostContextCount = 0;
  if (postContextContainer) {
    currentPostContextCount =
      postContextContainer.querySelectorAll(".search-condition").length;
  }
  const addPostContextButton = document.getElementById(
    "add-post-context-button"
  );
  if (addPostContextButton) {
    if (currentPostContextCount >= 5) {
      addPostContextButton.classList.add("disabled");
      addPostContextButton.title = "後方共起条件は最大5つまでです";
      addPostContextButton.disabled = true;
    } else {
      addPostContextButton.classList.remove("disabled");
      addPostContextButton.title = "後方共起条件を追加します（最大5つ）";
      addPostContextButton.disabled = false;
    }
  }
}

export function addContextCondition(type) {
  const keyCondition = document.querySelector(
    '.search-condition[data-is-key="true"]'
  );
  if (!keyCondition) {
    const searchConditions = document.getElementById("search-conditions");
    const firstCondition = searchConditions.querySelector(".search-condition");
    if (firstCondition) {
      firstCondition.dataset.isKey = "true";
    }
  }

  const containerId = `${type}-context-conditions`;
  const container = document.getElementById(containerId);

  if (!container) {
    console.error(`コンテナ ${containerId} が見つかりません`);
    return;
  }

  container.style.display = "block";

  const existingConditions = container.querySelectorAll(".search-condition");
  const count = existingConditions.length;

  if (count >= 5) {
    alert(
      `${type === "pre" ? "前方共起" : "後方共起"}条件の追加は最大5つまでです。`
    );
    return;
  }

  const conditionDiv = document.createElement("div");
  conditionDiv.className = "search-condition";
  conditionDiv.dataset.conditionId =
    "condition_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  conditionDiv.dataset.conditionType = type;

  const labelDiv = document.createElement("div");
  labelDiv.className = "search-condition-label";
  const newCount = count + 1;
  labelDiv.textContent = `${
    type === "pre" ? "前方共起" : "後方共起"
  }${newCount}`;

  const fromLabel = document.createElement("span");
  fromLabel.textContent = "キーから";
  fromLabel.style.margin = "0 5px";
  fromLabel.style.whiteSpace = "nowrap";

  const nextSelectValue = count + 1;
  const rangeSelect = document.createElement("select");
  rangeSelect.className = "condition-value context-width-select";
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach((num) => {
    const option = document.createElement("option");
    option.value = num;
    option.textContent = num;
    if (num === nextSelectValue && nextSelectValue <= 10) {
      option.selected = true;
    }
    rangeSelect.appendChild(option);
  });

  const unitSelect = document.createElement("select");
  unitSelect.className = "condition-value context-unit-select";
  ["語", "語以内"].forEach((unit) => {
    const option = document.createElement("option");
    option.value = unit;
    option.textContent = unit;
    unitSelect.appendChild(option);
  });

  const typeSelect = document.createElement("select");
  typeSelect.className = "condition-type";
  ["書字形出現形", "語彙素", "語彙素読み", "品詞", "活用型", "活用形", "発音形出現形"].forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt;
    typeSelect.appendChild(option);
  });

  const inputContainer = document.createElement("div");
  inputContainer.className = "search-condition-input";

  const inputField = document.createElement("input");
  inputField.type = "text";
  inputField.className = "condition-value";
  inputField.placeholder = `短単位の文字列を入力`;
  inputField.value = "";
  inputContainer.appendChild(inputField);

  const addShortUnitButton = document.createElement("button");
  addShortUnitButton.className = "add-short-unit-button button-small";
  addShortUnitButton.innerHTML =
    '<span class="icon">＋</span> 短単位の条件の追加';
  addShortUnitButton.title = "短単位の条件を追加します（最大5つ）";

  const conditionId = conditionDiv.dataset.conditionId;

  addShortUnitButton.addEventListener("click", function (e) {
    e.preventDefault();

    const shortUnitContainerId = "short-unit-container-" + conditionId;
    const shortUnitContainer = document.getElementById(shortUnitContainerId);

    if (shortUnitContainer) {
      const shortUnitCount = shortUnitContainer.querySelectorAll(
        ".short-unit-condition"
      ).length;
      if (shortUnitCount >= 5) {
        alert("短単位条件は最大5つまでです");
        return;
      }
    }
    updateContextConditionLabels(type);
    if (typeof addShortUnitCondition === "function") {
      addShortUnitCondition(conditionDiv, conditionId);

      const updatedShortUnitContainer =
        document.getElementById(shortUnitContainerId);
      if (updatedShortUnitContainer) {
        const updatedShortUnitCount =
          updatedShortUnitContainer.querySelectorAll(
            ".short-unit-condition"
          ).length;
        if (updatedShortUnitCount >= 5) {
          this.classList.add("disabled");
          this.title = "短単位条件は最大5つまでです";
        }
      }
    } else {
      console.error("addShortUnitCondition関数が定義されていません");
    }
  });

  const removeButton = document.createElement("button");
  removeButton.setAttribute("class", "remove-context-condition-button");
  removeButton.textContent = "共起条件削除";
  removeButton.type = "button";
  removeButton.addEventListener("click", () => {
    const conditionId = conditionDiv.dataset.conditionId;
    if (conditionId) {
      const shortUnitContainerId = "short-unit-container-" + conditionId;
      const shortUnitContainer = document.getElementById(shortUnitContainerId);
      if (shortUnitContainer) {
        shortUnitContainer.remove();
      }
    }

    conditionDiv.remove();

    if (container.children.length === 0) {
      container.style.display = "none";
    }

    updateContextConditionLabels(type);
    updateContextCounts();
  });

  conditionDiv.appendChild(labelDiv);
  conditionDiv.appendChild(fromLabel);
  conditionDiv.appendChild(rangeSelect);
  conditionDiv.appendChild(unitSelect);
  conditionDiv.appendChild(typeSelect);
  conditionDiv.appendChild(inputContainer);
  conditionDiv.appendChild(addShortUnitButton);
  conditionDiv.appendChild(removeButton);

  if (type === "pre") {
    if (container.firstChild) {
      container.insertBefore(conditionDiv, container.firstChild);
    } else {
      container.appendChild(conditionDiv);
    }
  } else {
    container.appendChild(conditionDiv);
  }

  updateContextConditionLabels(type);

  if (typeof attachChangeEvent === "function") {
    attachChangeEvent(typeSelect);
  } else {
    console.error(
      "[search-context-conditions] attachChangeEvent function not found or not imported from search-dropdown.js"
    );
  }

  updateContextCounts();

  if (inputField) {
    requestAnimationFrame(() => {
      inputField.focus();
    });
  }
}

function updateContextConditionLabels(type) {
  const container = document.getElementById(`${type}-context-conditions`);
  const conditions = container.querySelectorAll(".search-condition-label");

  conditions.forEach((labelDiv, index) => {
    labelDiv.textContent = `${type === "pre" ? "前方共起" : "後方共起"}${
      index + 1
    }`;
  });
}

document.addEventListener("DOMContentLoaded", function () {
  updateContextCounts();

  const addPreContextButton = document.getElementById("add-pre-context-button");
  if (addPreContextButton) {
    addPreContextButton.addEventListener("click", function (event) {
      event.preventDefault();
      if (this.classList.contains("disabled")) return;
      addContextCondition("pre");
    });
    addPreContextButton.title = "前方共起条件を追加します（最大5つ）";
  }

  const addPostContextButton = document.getElementById(
    "add-post-context-button"
  );
  if (addPostContextButton) {
    addPostContextButton.addEventListener("click", function (event) {
      event.preventDefault();
      if (this.classList.contains("disabled")) return;
      addContextCondition("post");
    });
    addPostContextButton.title = "後方共起条件を追加します（最大5つ）";
  }
});
