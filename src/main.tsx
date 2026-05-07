import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./tailwind.css";
import "overlayscrollbars/styles/overlayscrollbars.css";
import "./styles.css";
import "./styles/editor.css";
import "./styles/markdown.css";
import "highlight.js/styles/github-dark.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
