import { createMorphologyDropdown } from "./search-dropdown.js";

export function addShortUnitButtonToMainCondition(condition) {
  if (condition.querySelector(".add-short-unit-button")) {
    return;
  }

  if (!condition.dataset.conditionId) {
    condition.dataset.conditionId =
      "condition_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  const conditionId = condition.dataset.conditionId;

  const containerId = "short-unit-container-" + conditionId;
  const shortUnitContainer = document.getElementById(containerId);

  if (
    shortUnitContainer &&
    shortUnitContainer.querySelectorAll(".short-unit-condition").length > 0
  ) {
    return;
  }

  if (
    shortUnitContainer &&
    shortUnitContainer.querySelectorAll(".short-unit-condition").length >= 5
  ) {
    return;
  }

  const addButton = createShortUnitButton(condition);

  const inputContainer = condition.querySelector(".search-condition-input");
  if (inputContainer) {
    condition.insertBefore(addButton, inputContainer.nextSibling);
  } else {
    condition.appendChild(addButton);
  }
}

export function addShortUnitCondition(parentCondition, conditionId) {
  const containerId = "short-unit-container-" + conditionId;

  let shortUnitContainer = document.getElementById(containerId);

  let existingConditions = [];
  if (shortUnitContainer) {
    existingConditions = Array.from(
      shortUnitContainer.querySelectorAll(".short-unit-condition")
    );
  }

  if (existingConditions.length >= 5) {
    alert("この条件に対する短単位条件は最大5つまで追加可能です");
    return;
  }

  if (!shortUnitContainer) {
    shortUnitContainer = document.createElement("div");
    shortUnitContainer.className = "short-unit-conditions-container";
    shortUnitContainer.id = containerId;

    shortUnitContainer.dataset.parentConditionId = conditionId;

    if (parentCondition.nextSibling) {
      parentCondition.parentNode.insertBefore(
        shortUnitContainer,
        parentCondition.nextSibling
      );
    } else {
      parentCondition.parentNode.appendChild(shortUnitContainer);
    }
  }

  const parentAddButtons = parentCondition.querySelectorAll(
    ".add-short-unit-button"
  );
  parentAddButtons.forEach((btn) => btn.remove());

  const shortUnitCondition = document.createElement("div");
  shortUnitCondition.className = "short-unit-condition";

  const logicSelect = document.createElement("select");
  logicSelect.className = "short-unit-condition-logic";

  const andOption = document.createElement("option");
  andOption.value = "AND";
  andOption.textContent = "AND";
  logicSelect.appendChild(andOption);

  const orOption = document.createElement("option");
  orOption.value = "OR";
  orOption.textContent = "OR";
  logicSelect.appendChild(orOption);

  const notOption = document.createElement("option");
  notOption.value = "NOT";
  notOption.textContent = "NOT";
  logicSelect.appendChild(notOption);

  const typeSelect = document.createElement("select");
  typeSelect.className = "condition-type short-unit-condition-type";

  ["書字形出現形", "語彙素", "語彙素読み", "品詞", "活用型", "活用形", "発音形出現形"].forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt;
    typeSelect.appendChild(option);
  });

  const inputContainer = document.createElement("div");
  inputContainer.className =
    "search-condition-input short-unit-condition-input";

  const inputField = document.createElement("input");
  inputField.type = "text";
  inputField.className = "condition-value";
  inputField.placeholder = "短単位の文字列を入力";
  inputContainer.appendChild(inputField);

  const removeButton = document.createElement("button");
  removeButton.className = "remove-short-unit-condition-button button-small";
  removeButton.innerHTML = '<span class="icon">－</span>';
  removeButton.title = "この条件を削除";

  const addButton = document.createElement("button");
  addButton.className = "add-short-unit-button button-small";
  addButton.innerHTML = '<span class="icon">＋</span> 短単位の条件の追加';
  addButton.title = "短単位の条件を追加します（最大5つ）";

  addButton.addEventListener("click", function (e) {
    e.preventDefault();
    addButton.style.display = "none";
    addShortUnitCondition(parentCondition, conditionId);
  });

  removeButton.addEventListener("click", function (e) {
    e.preventDefault();
    shortUnitCondition.remove();

    const remainingCount = shortUnitContainer.querySelectorAll(
      ".short-unit-condition"
    ).length;

    if (remainingCount === 0) {
      shortUnitContainer.remove();

      addShortUnitButtonToMainCondition(parentCondition);
    } else {
      shortUnitContainer
        .querySelectorAll(".add-short-unit-button")
        .forEach((btn) => {
          btn.remove();
        });

      if (remainingCount < 5) {
        const lastCondition = shortUnitContainer.querySelector(
          ".short-unit-condition:last-child"
        );
        if (lastCondition) {
          addShortUnitButtonToLastCondition(
            lastCondition,
            parentCondition,
            conditionId
          );
        }
      }
    }
  });

  shortUnitCondition.appendChild(logicSelect);
  shortUnitCondition.appendChild(typeSelect);
  shortUnitCondition.appendChild(inputContainer);
  shortUnitCondition.appendChild(removeButton);

  const totalConditions = shortUnitContainer.querySelectorAll(
    ".short-unit-condition"
  ).length;

  if (totalConditions + 1 < 5) {
    shortUnitCondition.appendChild(addButton);
  }

  shortUnitContainer.appendChild(shortUnitCondition);

  if (totalConditions > 0) {
    shortUnitContainer
      .querySelectorAll(
        ".short-unit-condition:not(:last-child) .add-short-unit-button"
      )
      .forEach((btn) => {
        btn.remove();
      });
  }

  if (typeof createMorphologyDropdown === "function") {
    createMorphologyDropdown(typeSelect, inputContainer);
  }
}

export function getShortUnitConditions(parentCondition) {
  if (!parentCondition || !parentCondition.dataset.conditionId) {
    return [];
  }

  const conditionId = parentCondition.dataset.conditionId;
  const containerId = "short-unit-container-" + conditionId;
  const shortUnitContainer = document.getElementById(containerId);

  if (!shortUnitContainer) {
    return [];
  }

  const shortUnitConditions = [];

  shortUnitContainer
    .querySelectorAll(".short-unit-condition")
    .forEach((conditionEl) => {
      const logic = conditionEl.querySelector(
        ".short-unit-condition-logic"
      ).value;
      const type = conditionEl.querySelector(
        ".short-unit-condition-type"
      ).value;

      let value = "";
      const valueContainer = conditionEl.querySelector(
        ".short-unit-condition-input"
      );
      const inputField = valueContainer.querySelector("input.condition-value");
      if (inputField) {
        value = inputField.value;
      } else {
        const selectField = valueContainer.querySelector(
          "select.condition-value"
        );
        if (selectField) {
          value = selectField.getAttribute("data-value") || selectField.value;

          if (
            !value.includes("%") &&
            ["品詞", "活用型", "活用形"].includes(type)
          ) {
            value = value + "%";
          }
        }
      }

      shortUnitConditions.push({ logic, type, value });
    });

  return shortUnitConditions;
}

function checkShortUnitButtons() {
  const keyCondition = document.querySelector(".search-condition");
  if (keyCondition && !keyCondition.querySelector(".add-short-unit-button")) {
    addShortUnitButtonToMainCondition(keyCondition);
  }

  document
    .querySelectorAll(
      "#pre-context-conditions .search-condition, #post-context-conditions .search-condition"
    )
    .forEach((condition) => {
      const conditionId = condition.dataset.conditionId;
      if (conditionId) {
        const containerId = "short-unit-container-" + conditionId;
        const shortUnitContainer = document.getElementById(containerId);

        if (
          !shortUnitContainer ||
          shortUnitContainer.querySelectorAll(".short-unit-condition")
            .length === 0
        ) {
          const addButton = condition.querySelector(".add-short-unit-button");
          if (!addButton) {
            addShortUnitButtonToMainCondition(condition);
          }
        } else {
          const addButton = condition.querySelector(".add-short-unit-button");
          if (addButton) {
            addButton.remove();
          }
        }
      }
    });
}

function createShortUnitButton(parentCondition) {
  const addButton = document.createElement("button");
  addButton.className = "add-short-unit-button button-small";
  addButton.innerHTML = '<span class="icon">＋</span> 短単位の条件の追加';
  addButton.title = "短単位の条件を追加します（最大5つ）";

  if (!parentCondition.dataset.conditionId) {
    parentCondition.dataset.conditionId =
      "condition_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  const conditionId = parentCondition.dataset.conditionId;

  addButton.addEventListener("click", function (e) {
    e.preventDefault();
    addButton.style.display = "none";
    addShortUnitCondition(parentCondition, conditionId);
  });

  return addButton;
}

function addShortUnitButtonToLastCondition(
  lastCondition,
  parentCondition,
  conditionId
) {
  const existingButton = lastCondition.querySelector(".add-short-unit-button");
  if (existingButton) {
    return;
  }

  const removeButton = lastCondition.querySelector(
    ".remove-short-unit-condition-button"
  );
  if (!removeButton) {
    return;
  }

  const addButton = document.createElement("button");
  addButton.className = "add-short-unit-button button-small";
  addButton.innerHTML = '<span class="icon">＋</span> 短単位の条件の追加';
  addButton.title = "短単位の条件を追加します（最大5つ）";

  addButton.addEventListener("click", function (e) {
    e.preventDefault();
    addButton.style.display = "none";
    addShortUnitCondition(parentCondition, conditionId);
  });

  removeButton.after(addButton);
}

document.addEventListener("DOMContentLoaded", function () {
  const keyCondition = document.querySelector(".search-condition");
  if (keyCondition) {
    addShortUnitButtonToMainCondition(keyCondition);
  }

  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === "childList") {
        checkShortUnitButtons();
      }
    });
  });

  const searchConditions = document.getElementById("search-conditions");
  if (searchConditions) {
    observer.observe(searchConditions, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  }
  setTimeout(checkShortUnitButtons, 500);
});
