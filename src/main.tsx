import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// No StrictMode: the flip board is an imperative DOM engine, and StrictMode's
// double-invoked effects would spin up the engine twice in development.
createRoot(document.getElementById("root")!).render(<App />);
