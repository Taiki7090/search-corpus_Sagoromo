export function getDecadeKey(year) {
  if (year === null || year === undefined || year === "") return "unknown";
  try {
    const yearStr = String(year).trim();
    let parsedYear = NaN;

    if (/^\d{4}$/.test(yearStr)) {
      parsedYear = parseInt(yearStr, 10);
    } else {
      const match = yearStr.match(/^(\d{4})/);
      if (match) {
        parsedYear = parseInt(match[1], 10);
      }
    }

    if (isNaN(parsedYear)) return "unknown";

    if (parsedYear < 1870) return "before1869s";
    if (1870 <= parsedYear && parsedYear < 1880) return "1870s";
    if (1880 <= parsedYear && parsedYear < 1890) return "1880s";
    if (1890 <= parsedYear && parsedYear < 1900) return "1890s";
    if (1900 <= parsedYear && parsedYear < 1910) return "1900s";
    if (1910 <= parsedYear && parsedYear < 1920) return "1910s";
    if (1920 <= parsedYear && parsedYear < 1930) return "1920s";
    if (1930 <= parsedYear && parsedYear < 1940) return "1930s";
    if (1940 <= parsedYear && parsedYear < 1950) return "1940s";
    if (1950 <= parsedYear && parsedYear < 1960) return "1950s";
    if (1960 <= parsedYear && parsedYear < 1970) return "1960s";
    if (1970 <= parsedYear && parsedYear < 1980) return "1970s";
    if (1980 <= parsedYear && parsedYear < 1990) return "1980s";
    if (1990 <= parsedYear && parsedYear < 2000) return "1990s";
    if (parsedYear >= 2000) return "after2000s";

    return "unknown";
  } catch (e) {
    console.error("[getDecadeKey] Error parsing year:", year, e);
    return "unknown";
  }
}
