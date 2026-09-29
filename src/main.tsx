import React from "react";
import ReactDOM from "react-dom/client";
import { EnsureKontentAsParent } from "./customElement/EnsureKontentAsParent";
import { App } from "./App";
import { CustomElementContext } from "./customElement/CustomElementContext";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Cannot find the root element. Please, check your html.");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <EnsureKontentAsParent>
      <CustomElementContext height="dynamic">
        <App />
      </CustomElementContext>
    </EnsureKontentAsParent>
  </React.StrictMode>
);
