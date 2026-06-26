import {
  getFormattedShortUnitConditionsText,
  getFormattedSingleCondition,
} from "../search/search-conditions-common.js";

export function buildSearchConditionsText() {
  let conditionsText = "";
  let hasConditions = false;

  const keyElement = document.querySelector(
    '.search-condition[data-is-key="true"]'
  );
  if (!keyElement) {
    return "検索条件: キー条件なし";
  }

  conditionsText += "キー: ";

  let hasShortUnitConditions = false;

  if (keyElement.dataset.conditionId) {
    const shortUnitContainerId =
      "short-unit-container-" + keyElement.dataset.conditionId;
    const shortUnitContainer = document.getElementById(shortUnitContainerId);

    if (
      shortUnitContainer &&
      shortUnitContainer.querySelectorAll(".short-unit-condition").length > 0
    ) {
      hasShortUnitConditions = true;
    }
  }

  if (hasShortUnitConditions) {
    conditionsText +=
      "(" + getFormattedShortUnitConditionsText(keyElement) + ")";
  } else {
    conditionsText += getFormattedSingleCondition(keyElement);
  }

  hasConditions = true;

  const preContextElements = document.querySelectorAll(
    "#pre-context-conditions .search-condition"
  );
  if (preContextElements.length > 0) {
    for (let i = 0; i < preContextElements.length; i++) {
      const element = preContextElements[i];

      if (hasConditions) {
        conditionsText += "\nAND 前方共起: ";
      } else {
        conditionsText += "前方共起: ";
        hasConditions = true;
      }

      const rangeSelect = element.querySelector(".context-width-select");
      const unitSelect = element.querySelector(".context-unit-select");
      const range = rangeSelect ? rangeSelect.value : "1";
      const unit = unitSelect ? unitSelect.value : "語";

      let hasPreShortUnitConditions = false;

      if (element.dataset.conditionId) {
        const shortUnitContainerId =
          "short-unit-container-" + element.dataset.conditionId;
        const shortUnitContainer =
          document.getElementById(shortUnitContainerId);

        if (
          shortUnitContainer &&
          shortUnitContainer.querySelectorAll(".short-unit-condition").length >
            0
        ) {
          hasPreShortUnitConditions = true;
        }
      }

      if (hasPreShortUnitConditions) {
        conditionsText +=
          "(" + getFormattedShortUnitConditionsText(element) + ") ";
      } else {
        conditionsText += getFormattedSingleCondition(element) + " ";
      }

      if (unit === "語以内") {
        conditionsText += `WITHIN ${range} WORDS FROM キー`;
      } else {
        conditionsText += `ON ${range} WORDS FROM キー`;
      }
    }
  }

  const postContextElements = document.querySelectorAll(
    "#post-context-conditions .search-condition"
  );
  if (postContextElements.length > 0) {
    for (let i = 0; i < postContextElements.length; i++) {
      const element = postContextElements[i];

      if (hasConditions) {
        conditionsText += "\nAND 後方共起: ";
      } else {
        conditionsText += "後方共起: ";
        hasConditions = true;
      }

      const rangeSelect = element.querySelector(".context-width-select");
      const unitSelect = element.querySelector(".context-unit-select");
      const range = rangeSelect ? rangeSelect.value : "1";
      const unit = unitSelect ? unitSelect.value : "語";

      let hasPostShortUnitConditions = false;

      if (element.dataset.conditionId) {
        const shortUnitContainerId =
          "short-unit-container-" + element.dataset.conditionId;
        const shortUnitContainer =
          document.getElementById(shortUnitContainerId);

        if (
          shortUnitContainer &&
          shortUnitContainer.querySelectorAll(".short-unit-condition").length >
            0
        ) {
          hasPostShortUnitConditions = true;
        }
      }

      if (hasPostShortUnitConditions) {
        conditionsText +=
          "(" + getFormattedShortUnitConditionsText(element) + ") ";
      } else {
        conditionsText += getFormattedSingleCondition(element) + " ";
      }

      if (unit === "語以内") {
        conditionsText += `WITHIN ${range} WORDS FROM キー`;
      } else {
        conditionsText += `ON ${range} WORDS FROM キー`;
      }
    }
  }

  return conditionsText;
}
