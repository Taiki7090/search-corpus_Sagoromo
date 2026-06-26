import { initializeUploadUI } from "../ui/ui-upload.js";
import { initializeDataHandler } from "../services/data-service.js";
import { updateCurrentDataSourceDisplay } from "./ui-controller.js";
import { updateDataSourceRadioButtons } from "../ui/ui-datasource.js";

export class UIInitializer {
  async setupInitialUI() {
    initializeUploadUI();
    initializeDataHandler();
    this.setupDataSourceDefaults();
    this.hideResultAreas();
  }

  setupDataSourceDefaults() {
    const defaultRadio = document.getElementById("data-source-default");
    const uploadRadio = document.getElementById("data-source-upload");

    if (defaultRadio) defaultRadio.checked = true;
    if (uploadRadio) {
      uploadRadio.checked = false;
      uploadRadio.disabled = true;
    }

    updateCurrentDataSourceDisplay("default");
    updateDataSourceRadioButtons("default");
  }

  hideResultAreas() {
    const areas = ["unit-results", "string-results"];
    areas.forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.style.display = "none";
    });
  }
}
