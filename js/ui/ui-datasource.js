export function updateDataSourceRadioButtons(activeDataSourceType) {
  const dataSourceDefaultRadio = document.getElementById("data-source-default");
  const dataSourceUploadRadio = document.getElementById("data-source-upload");

  if (dataSourceDefaultRadio && dataSourceUploadRadio) {
    if (activeDataSourceType === "upload") {
      dataSourceUploadRadio.checked = true;
      dataSourceDefaultRadio.checked = false;
    } else {
      dataSourceDefaultRadio.checked = true;
      dataSourceUploadRadio.checked = false;
    }
  } else {
    console.warn(
      "[UI] Data source radio buttons not found for updating check state."
    );
  }
}
