import React from "react";
import ReactDOM from "react-dom/client";
import TimerPopout from "./screens/TimerPopout";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <TimerPopout />
  </React.StrictMode>
);
