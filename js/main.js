import { App } from "./app.js";

const app = new App();
app.initialize().catch((error) => {
  console.error("[App] Fatal initialization error:", error);
  document.body.classList.add("app-fatal-error");
  document.body.dataset.errorMessage = error.message;
});
