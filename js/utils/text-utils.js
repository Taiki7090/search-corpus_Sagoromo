export function extractWorkTitleFromFileName(nameWithoutExt) {
  if (!nameWithoutExt) return null;

  let titleToProcess = nameWithoutExt;

  // aozora pattern
  const aozoraMatch = titleToProcess.match(/^.+?\s+(.+)/);
  if (aozoraMatch && aozoraMatch[1]) {
    const title = aozoraMatch[1].trim();
    return title;
  }

  // sokkikoudan pattern
  const sokkiMatch = titleToProcess.match(/^(?:\d{2}_\d{2}_)?(.+)/);
  if (sokkiMatch && sokkiMatch[1]) {
    let potentialTitleAfterPrefixRemoval = sokkiMatch[1];
    const serialMatch = potentialTitleAfterPrefixRemoval.match(/^(.*?)_S\d+$/);
    if (serialMatch && serialMatch[1]) {
      return serialMatch[1];
    }
    return potentialTitleAfterPrefixRemoval;
  }

  // genji pattern
  const genjiMatch = titleToProcess.match(/^\w{4}-(.{2})_\d{6,9}_([1-4])/);
  if (genjiMatch && genjiMatch[1]) {
    return genjiMatch[1];
  }

  // Treat as a series if the title has a suffix like '_S001'
  const genericSerialMatch = titleToProcess.match(/^(.*?)_S\d+$/);
  if (genericSerialMatch && genericSerialMatch[1]) {
    return genericSerialMatch[1];
  }

  return titleToProcess;
}

export function normalizeFileNameForKey(fileName) {
  if (!fileName) return "";
  return fileName
    .replace(/\.txt$/i, "")
    .trim()
    .replace(/[\s　]+/g, "_");
}

export function escapeHtml(unsafe) {
  if (typeof unsafe !== "string") return "";
  return unsafe
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "&apos;");
}
