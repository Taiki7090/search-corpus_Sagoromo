export function matchesCondition(token, condition) {
  if (!token || !condition) {
    return false;
  }

  if (!condition.value || condition.value.trim() === "") {
    return true;
  }

  try {
    switch (condition.type) {
      case "書字形出現形":
        return token.書字形出現形 === condition.value;
      case "語彙素":
        return token.語彙素 === condition.value;
      case "語彙素読み":
        return token.語彙素読み === condition.value;
      case "発音形出現形":
        return token.発音形出現形 === condition.value;
      case "品詞":
        const tokenPos = token.品詞 || "";
        const conditionPos = condition.value;

        if (conditionPos.includes("%")) {
          const basePattern = conditionPos.replace(/%$/, "");
          return tokenPos.startsWith(basePattern);
        } else if (conditionPos.includes("*")) {
          const conditionParts = conditionPos.split("-");
          const tokenParts = tokenPos.split("-");

          for (let i = 0; i < conditionParts.length; i++) {
            if (
              conditionParts[i] !== "*" &&
              (i >= tokenParts.length || conditionParts[i] !== tokenParts[i])
            ) {
              return false;
            }
          }
          return true;
        } else {
          return tokenPos === conditionPos;
        }
      case "活用型":
        if (condition.value.includes("%")) {
          const basePattern = condition.value.replace(/%$/, "");
          return token.活用型 && token.活用型.startsWith(basePattern);
        } else if (condition.value.includes("-")) {
          return token.活用型 === condition.value;
        } else {
          return token.活用型 && token.活用型.startsWith(condition.value);
        }
      case "活用形":
        if (condition.value.includes("%")) {
          const basePattern = condition.value.replace(/%$/, "");
          return token.活用形 && token.活用形.startsWith(basePattern);
        } else if (condition.value.includes("-")) {
          return token.活用形 === condition.value;
        } else {
          return token.活用形 && token.活用形.startsWith(condition.value);
        }
      default:
        return false;
    }
  } catch (e) {
    console.error("条件マッチングエラー:", e, { token, condition });
    return false;
  }
}

export function getCrossBoundarySetting() {
  const unitBoundarySelect = document.getElementById("context-boundary");
  const stringBoundarySelect = document.getElementById(
    "string-context-boundary"
  );

  const activeTab = document
    .querySelector(".tab.active")
    ?.getAttribute("data-tab");
  let boundarySelect;
  if (activeTab === "string-search" && stringBoundarySelect) {
    boundarySelect = stringBoundarySelect;
  } else if (unitBoundarySelect) {
    boundarySelect = unitBoundarySelect;
  }

  return boundarySelect ? boundarySelect.value === "cross" : false;
}

export function hasBoundaryBetween(tokens, startIdx, endIdx) {
  if (!tokens || startIdx === endIdx) return false;

  const minIdx = Math.min(startIdx, endIdx);
  const maxIdx = Math.max(startIdx, endIdx);

  for (let i = minIdx + 1; i < maxIdx; i++) {
    if (tokens[i] && tokens[i].文境界 === "B") {
      return true;
    }
  }
  return false;
}
