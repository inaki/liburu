import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./tailwind.css";
import "./styles.css";
import "./styles/shell-explorer.css";
import "./styles/home.css";
import "./styles/document-workspace.css";
import "./styles/document-sidepanel.css";
import "./styles/editor.css";
import "./styles/markdown.css";
import "./styles/settings.css";
import "./styles/chrome.css";
import "highlight.js/styles/github-dark.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
