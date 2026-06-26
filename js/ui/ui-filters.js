import {
  getActiveDataSourceType,
  getVolumeFilterStates,
  setVolumeFilterState,
  getManuscriptFilterStates,
  setManuscriptFilterState,
} from "../store/app-state.js";
export function rebuildFilterCheckboxesFromCorpus(corpusData) {
  const fileMetadata = corpusData?.file_metadata || {};

  const volumeSet = new Set();
  const manuscriptSet = new Set();

  for (const meta of Object.values(fileMetadata)) {
    if (meta.recording_volume != null && meta.recording_volume !== "") {
      volumeSet.add(meta.recording_volume);
    }
    if (meta.speaker_name != null && meta.speaker_name !== "") {
      manuscriptSet.add(meta.speaker_name);
    }
  }

  const volumes = Array.from(volumeSet);
  const manuscriptNames = Array.from(manuscriptSet);

  buildCheckboxGroup("default-volume-options", volumes, "volume-filter", "volume-");
  buildCheckboxGroup("string-default-volume-options", volumes, "string-volume-filter", "string-volume-");
  buildCheckboxGroup("default-manuscript-options", manuscriptNames, "manuscript-filter", "manuscript-");
  buildCheckboxGroup("string-default-manuscript-options", manuscriptNames, "string-manuscript-filter", "string-manuscript-");
}

function buildCheckboxGroup(containerId, values, name, idPrefix) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  for (const value of values) {
    const div = document.createElement("div");
    div.className = "checkbox-group";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = idPrefix + value;
    input.name = name;
    input.value = value;
    input.checked = true;

    const label = document.createElement("label");
    label.htmlFor = idPrefix + value;
    label.textContent = value;

    div.appendChild(input);
    div.appendChild(label);
    container.appendChild(div);
  }
}

export function setupVolumeFilterListeners() {
  const unitFilter = document.getElementById("default-volume-filter");
  if (unitFilter) {
    unitFilter.addEventListener("change", (event) => {
      if (event.target.name === "volume-filter") {
        saveCurrentVolumeFilterState("unit");
      }
    });
  }
  const stringFilter = document.getElementById("string-default-volume-filter");
  if (stringFilter) {
    stringFilter.addEventListener("change", (event) => {
      if (event.target.name === "string-volume-filter") {
        saveCurrentVolumeFilterState("string");
      }
    });
  }
}

export function saveCurrentVolumeFilterState(searchType) {
  const dataSourceType = getActiveDataSourceType() || "default";
  const checkboxName =
    searchType === "unit" ? "volume-filter" : "string-volume-filter";
  const volumeFilterContainerId =
    searchType === "unit"
      ? "default-volume-filter"
      : "string-default-volume-filter";
  const volumeFilterContainer = document.getElementById(volumeFilterContainerId);

  if (dataSourceType === "default" && volumeFilterContainer) {
    volumeFilterContainer
      .querySelectorAll(`input[name="${checkboxName}"]`)
      .forEach((cb) => {
        setVolumeFilterState(dataSourceType, searchType, cb.value, cb.checked);
      });
  }
}

export function restoreVolumeFilterState(searchType) {
  const dataSourceType = getActiveDataSourceType() || "default";
  const checkboxName =
    searchType === "unit" ? "volume-filter" : "string-volume-filter";
  const volumeFilterContainerId =
    searchType === "unit"
      ? "default-volume-filter"
      : "string-default-volume-filter";
  const volumeFilterContainer = document.getElementById(volumeFilterContainerId);

  if (dataSourceType === "default" && volumeFilterContainer) {
    const stateObj = getVolumeFilterStates()[dataSourceType][searchType];
    volumeFilterContainer
      .querySelectorAll(`input[name="${checkboxName}"]`)
      .forEach((cb) => {
        if (stateObj[cb.value] !== undefined) {
          cb.checked = stateObj[cb.value];
        }
      });
  }
}

export function getVolumeFilterSettingsFromDOM() {
  const volumeFilterValues = [];
  document
    .querySelectorAll('input[name="volume-filter"]:checked')
    .forEach((input) => {
      volumeFilterValues.push(input.value);
    });
  const manuscriptFilterValues = getManuscriptFilterValuesFromDOM("manuscript-filter");
  return { volumeFilterValues, manuscriptFilterValues };
}

export function getStringVolumeFilterSettingsFromDOM() {
  const volumeFilterValues = [];
  document
    .querySelectorAll('input[name="string-volume-filter"]:checked')
    .forEach((input) => {
      volumeFilterValues.push(input.value);
    });
  const manuscriptFilterValues = getManuscriptFilterValuesFromDOM("string-manuscript-filter");
  return { volumeFilterValues, manuscriptFilterValues };
}

function getManuscriptFilterValuesFromDOM(name) {
  const values = [];
  document.querySelectorAll(`input[name="${name}"]:checked`).forEach((input) => {
    values.push(input.value);
  });
  return values;
}

export function setupManuscriptFilterListeners() {
  const unitFilter = document.getElementById("default-volume-filter");
  if (unitFilter) {
    unitFilter.addEventListener("change", (event) => {
      if (event.target.name === "manuscript-filter") {
        saveCurrentManuscriptFilterState("unit");
      }
    });
  }
  const stringFilter = document.getElementById("string-default-volume-filter");
  if (stringFilter) {
    stringFilter.addEventListener("change", (event) => {
      if (event.target.name === "string-manuscript-filter") {
        saveCurrentManuscriptFilterState("string");
      }
    });
  }
}

export function saveCurrentManuscriptFilterState(searchType) {
  const dataSourceType = getActiveDataSourceType() || "default";
  const checkboxName =
    searchType === "unit" ? "manuscript-filter" : "string-manuscript-filter";
  const containerId =
    searchType === "unit"
      ? "default-volume-filter"
      : "string-default-volume-filter";
  const container = document.getElementById(containerId);

  if (dataSourceType === "default" && container) {
    container
      .querySelectorAll(`input[name="${checkboxName}"]`)
      .forEach((cb) => {
        setManuscriptFilterState(dataSourceType, searchType, cb.value, cb.checked);
      });
  }
}

export function restoreManuscriptFilterState(searchType) {
  const dataSourceType = getActiveDataSourceType() || "default";
  const checkboxName =
    searchType === "unit" ? "manuscript-filter" : "string-manuscript-filter";
  const containerId =
    searchType === "unit"
      ? "default-volume-filter"
      : "string-default-volume-filter";
  const container = document.getElementById(containerId);

  if (dataSourceType === "default" && container) {
    const stateObj = getManuscriptFilterStates()[dataSourceType][searchType];
    container
      .querySelectorAll(`input[name="${checkboxName}"]`)
      .forEach((cb) => {
        if (stateObj[cb.value] !== undefined) {
          cb.checked = stateObj[cb.value];
        }
      });
  }
}
