import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyTheme } from "./hooks/useTheme";
import "./fonts";
import "./global.css";

const storedTheme = localStorage.getItem("tide:website-theme");
applyTheme(storedTheme === "light" ? "light" : storedTheme === "dark" ? "dark" : "dark");

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
