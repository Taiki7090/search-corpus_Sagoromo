const state = {
  corpusData: null,
  defaultCorpusData: null,
  uploadedCorpusData: null,
  indexData: null,
  defaultIndexData: null,
  uploadedIndexData: null,
  statsData: null,
  defaultStatsData: null,
  uploadedStatsData: null,
  activeDataSourceType: "default",

  unitSearchResultIds: [],
  unitTotalHits: 0,
  unitCurrentPage: 1,
  stringSearchResultObjects: [],
  stringTotalHits: 0,
  stringCurrentPage: 1,

  unitResultsPerPage: 20,
  stringResultsPerPage: 20,

  isDataLoaded: false,

  isWorkerDataLoaded: false,
  columnStates: {
    default: { unit: {}, string: {} },
    upload: { unit: {}, string: {} },
  },
  volumeFilterStates: {
    default: { unit: {}, string: {} },
    upload: { unit: {}, string: {} },
  },
  manuscriptFilterStates: {
    default: { unit: {}, string: {} },
    upload: { unit: {}, string: {} },
  },
};

export function getState() {
  return state;
}

export function getCorpusData() {
  return state.corpusData;
}

export function setCorpusData(data) {
  state.corpusData = data;
}

export function getIndexData() {
  return state.indexData;
}

export function setIndexData(data) {
  state.indexData = data;
}

export function getStatsData() {
  return state.statsData;
}

export function setStatsData(data) {
  state.statsData = data;
}

export function getActiveDataSourceType() {
  return state.activeDataSourceType;
}

export function setActiveDataSourceType(type) {
  state.activeDataSourceType = type;

  if (type === "upload" && state.uploadedCorpusData) {
    setCorpusData(state.uploadedCorpusData);
    setIndexData(state.uploadedIndexData);
    setStatsData(state.uploadedStatsData);
  } else {
    setCorpusData(state.defaultCorpusData);
    setIndexData(state.defaultIndexData);
    setStatsData(state.defaultStatsData);
  }
}

export function getDefaultCorpusData() {
  return state.defaultCorpusData;
}

export function getUploadedCorpusData() {
  return state.uploadedCorpusData;
}

export function getUploadedIndexData() {
  return state.uploadedIndexData;
}

export function getUploadedStatsData() {
  return state.uploadedStatsData;
}

export function storeDefaultData(corpus, index, stats) {
  state.defaultCorpusData = corpus;
  state.defaultIndexData = index;
  state.defaultStatsData = stats;
  if (state.activeDataSourceType === "default") {
    setCorpusData(corpus);
    setIndexData(index);
    setStatsData(stats);
  }
}

export function storeUploadedData(corpus, index, stats) {
  state.uploadedCorpusData = corpus;
  state.uploadedIndexData = index;
  state.uploadedStatsData = stats;
}

export function clearUploadedDataState() {
  state.uploadedCorpusData = null;
  state.uploadedIndexData = null;
  state.uploadedStatsData = null;
}

export function getIsDataLoaded() {
  return state.isDataLoaded;
}

export function setIsDataLoaded(loaded) {
  state.isDataLoaded = loaded;
}

export function getIsWorkerDataLoaded() {
  return state.isWorkerDataLoaded;
}

export function setIsWorkerDataLoaded(loaded) {
  state.isWorkerDataLoaded = loaded;
}

export function getUnitSearchResultIds() {
  return state.unitSearchResultIds;
}

export function setUnitSearchResultIds(items) {
  state.unitSearchResultIds = items;
}

export function getUnitResultsPerPage() {
  return state.unitResultsPerPage;
}

export function setUnitResultsPerPage(count) {
  state.unitResultsPerPage = count;
}

export function getStringResultsPerPage() {
  return state.stringResultsPerPage;
}

export function setStringResultsPerPage(count) {
  state.stringResultsPerPage = count;
}

export function getColumnStates() {
  return state.columnStates;
}

export function setColumnState(
  dataSourceType,
  searchType,
  internalKey,
  isChecked
) {
  if (
    state.columnStates[dataSourceType] &&
    state.columnStates[dataSourceType][searchType]
  ) {
    state.columnStates[dataSourceType][searchType][internalKey] = isChecked;
  }
}

export function getVolumeFilterStates() {
  return state.volumeFilterStates;
}

export function setVolumeFilterState(
  dataSourceType,
  searchType,
  volumeValue,
  isChecked
) {
  if (
    state.volumeFilterStates[dataSourceType] &&
    state.volumeFilterStates[dataSourceType][searchType]
  ) {
    state.volumeFilterStates[dataSourceType][searchType][volumeValue] = isChecked;
  }
}

export function getManuscriptFilterStates() {
  return state.manuscriptFilterStates;
}

export function setManuscriptFilterState(
  dataSourceType,
  searchType,
  manuscriptValue,
  isChecked
) {
  if (
    state.manuscriptFilterStates[dataSourceType] &&
    state.manuscriptFilterStates[dataSourceType][searchType]
  ) {
    state.manuscriptFilterStates[dataSourceType][searchType][manuscriptValue] = isChecked;
  }
}

export function getUnitTotalHits() {
  return state.unitTotalHits;
}

export function setUnitTotalHits(hits) {
  state.unitTotalHits = hits;
}

export function getUnitCurrentPage() {
  return state.unitCurrentPage;
}

export function setUnitCurrentPage(page) {
  state.unitCurrentPage = page;
}

export function getStringSearchResultObjects() {
  return state.stringSearchResultObjects;
}

export function setStringSearchResultObjects(objects) {
  state.stringSearchResultObjects = objects;
}

export function getStringTotalHits() {
  return state.stringTotalHits;
}

export function setStringTotalHits(hits) {
  state.stringTotalHits = hits;
}

export function getStringCurrentPage() {
  return state.stringCurrentPage;
}

export function setStringCurrentPage(page) {
  state.stringCurrentPage = page;
}
