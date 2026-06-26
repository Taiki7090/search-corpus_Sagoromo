import {
  evaluateTokenAgainstCondition,
  checkContextConditions,
} from "./search-context-conditions.js";

export function filterResultsInMainThread(
  candidateIds,
  keyCondition,
  preContextConditions,
  postContextConditions,
  corpusData
) {
  const finalResults = [];

  if (!corpusData?.tokens) {
    console.warn(
      "[SearchFilter] Corpus data or tokens not available in filterResultsInMainThread."
    );
    return [];
  }
  const tokens = corpusData.tokens;

  for (const tokenId of candidateIds) {
    const token = tokens[tokenId];
    if (!token) continue;

    if (!evaluateTokenAgainstCondition(token, keyCondition)) {
      continue;
    }

    const contextResult = checkContextConditions(
      tokenId,
      preContextConditions,
      postContextConditions,
      tokens
    );
    if (!contextResult || !contextResult.success) continue;

    const preCombinations = calculateCartesianProduct(
      contextResult.preMatchedTokenIdsPerCondition
    );
    const postCombinations = calculateCartesianProduct(
      contextResult.postMatchedTokenIdsPerCondition
    );

    if (preCombinations.length === 0 && postCombinations.length === 0) {
      if (
        preContextConditions.length === 0 &&
        postContextConditions.length === 0
      ) {
        finalResults.push({
          tokenId: tokenId,
          preHighlightIds: new Set(),
          postHighlightIds: new Set(),
        });
      } else if (
        contextResult.preMatchedTokenIdsPerCondition.every(
          (arr) => arr.length === 0
        ) &&
        contextResult.postMatchedTokenIdsPerCondition.every(
          (arr) => arr.length === 0
        )
      ) {
        finalResults.push({
          tokenId: tokenId,
          preHighlightIds: new Set(),
          postHighlightIds: new Set(),
        });
      }
    } else if (preCombinations.length > 0 && postCombinations.length === 0) {
      preCombinations.forEach((preCombo) => {
        finalResults.push({
          tokenId: tokenId,
          preHighlightIds: new Set(preCombo),
          postHighlightIds: new Set(),
        });
      });
    } else if (preCombinations.length === 0 && postCombinations.length > 0) {
      postCombinations.forEach((postCombo) => {
        finalResults.push({
          tokenId: tokenId,
          preHighlightIds: new Set(),
          postHighlightIds: new Set(postCombo),
        });
      });
    } else {
      preCombinations.forEach((preCombo) => {
        postCombinations.forEach((postCombo) => {
          finalResults.push({
            tokenId: tokenId,
            preHighlightIds: new Set(preCombo),
            postHighlightIds: new Set(postCombo),
          });
        });
      });
    }
  }
  return finalResults;
}

function calculateCartesianProduct(arrays) {
  // Calculate the Cartesian product
  const nonEmptyArrays = arrays.filter((arr) => arr && arr.length > 0);

  if (nonEmptyArrays.length === 0) {
    return [];
  }

  return nonEmptyArrays.reduce(
    (accumulator, currentArray) => {
      const newAccumulator = [];
      accumulator.forEach((accItem) => {
        currentArray.forEach((currentItem) => {
          newAccumulator.push(accItem.concat(currentItem));
        });
      });
      return newAccumulator;
    },
    [[]]
  );
}
