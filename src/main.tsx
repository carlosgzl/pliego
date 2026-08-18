import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./estilos/base.css";
import "./estilos/app.css";
import "./estilos/pagina.css";

const raiz = document.getElementById("raiz");
if (!raiz) {
  throw new Error("Falta el nodo #raiz en index.html");
}

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
