export function getDisplayColumns() {
  const columns = [];
  document
    .querySelectorAll('input[name="display-column"]:checked')
    .forEach((checkbox) => {
      const parentGroup = checkbox.closest(".checkbox-group");
      if (parentGroup && parentGroup.style.display !== "none") {
        columns.push(checkbox.value);
      }
    });
  const keyCheckbox = document.getElementById("col-key");
  const keyGroup = keyCheckbox ? keyCheckbox.closest(".checkbox-group") : null;
  if (
    !columns.includes("キー") &&
    keyGroup &&
    keyGroup.style.display !== "none"
  ) {
    const keyIndex = columnOrderInternalKeys.indexOf("キー");
    if (keyIndex !== -1) {
      let inserted = false;
      for (let i = 0; i < columns.length; i++) {
        if (columnOrderInternalKeys.indexOf(columns[i]) > keyIndex) {
          columns.splice(i, 0, "キー");
          inserted = true;
          break;
        }
      }
      if (!inserted) columns.push("キー");
    } else {
      columns.splice(4, 0, "キー");
      console.warn(
        "[getDisplayColumns] 'キー' not found in columnOrderInternalKeys, inserting at default position."
      );
    }
  }
  return columns;
}

export function getStringDisplayColumns() {
  const columns = [];
  document
    .querySelectorAll('input[name="string-display-column"]:checked')
    .forEach((checkbox) => {
      const parentGroup = checkbox.closest(".checkbox-group");
      if (parentGroup && parentGroup.style.display !== "none") {
        columns.push(checkbox.value);
      }
    });
  const keyCheckbox = document.getElementById("string-col-key");
  const keyGroup = keyCheckbox ? keyCheckbox.closest(".checkbox-group") : null;
  if (
    !columns.includes("キー") &&
    keyGroup &&
    keyGroup.style.display !== "none"
  ) {
    const keyIndex = columnOrderInternalKeys.indexOf("キー");
    if (keyIndex !== -1) {
      let inserted = false;
      for (let i = 0; i < columns.length; i++) {
        if (columnOrderInternalKeys.indexOf(columns[i]) > keyIndex) {
          columns.splice(i, 0, "キー");
          inserted = true;
          break;
        }
      }
      if (!inserted) columns.push("キー");
    } else {
      columns.splice(4, 0, "キー");
      console.warn(
        "[getStringDisplayColumns] 'キー' not found in columnOrderInternalKeys, inserting at default position."
      );
    }
  }
  return columns;
}
