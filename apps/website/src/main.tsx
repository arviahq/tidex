import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { applyTheme } from "./hooks/useTheme";
import "./fonts";
import "./global.css";
import "./site.css";

const storedTheme = localStorage.getItem("tide:website-theme");
applyTheme(storedTheme === "light" ? "light" : storedTheme === "dark" ? "dark" : "dark");

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
