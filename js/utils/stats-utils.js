export function calculateFilteredStats(statsData) {
  const defaultStats = { total_tokens: 0, filtered_tokens: 0, file_count: 0 };
  if (!statsData || !statsData.volume_stats) {
    console.warn("[calculateFilteredStats] Invalid statsData provided.");
    return defaultStats;
  }

  const activeTab =
    document.querySelector(".tab.active")?.getAttribute("data-tab") ||
    "unit-search";
  const checkboxName =
    activeTab === "string-search" ? "string-volume-filter" : "volume-filter";

  const selectedVolumeKeys = new Set();
  let isAnyChecked = false;

  document
    .querySelectorAll(`input[name="${checkboxName}"]:checked`)
    .forEach((checkbox) => {
      isAnyChecked = true;
      selectedVolumeKeys.add(checkbox.value);
    });

  if (!isAnyChecked) {
    return {
      total_tokens: statsData.total_tokens || 0,
      filtered_tokens: statsData.filtered_tokens || 0,
      file_count: statsData.file_count || 0,
    };
  }

  let totalTokens = 0;
  let filteredTokens = 0;

  selectedVolumeKeys.forEach((volumeKey) => {
    const volumeStat = statsData.volume_stats[volumeKey];
    if (volumeStat) {
      totalTokens += volumeStat.total_tokens || 0;
      filteredTokens += volumeStat.filtered_tokens || 0;
    }
  });

  const calculatedFileCount = statsData.file_count || 0;

  return {
    total_tokens: totalTokens,
    filtered_tokens: filteredTokens,
    file_count: calculatedFileCount,
  };
}
