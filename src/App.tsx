import { Routes, Route } from "react-router-dom";
import CoordinatePlotter from "./page/CoordinatePlotter";
import { DrawingCanvas } from "./components/DrawingCanvas";

function App() {
  return (
    <Routes>
      <Route path="/" element={<CoordinatePlotter />} />
      <Route path="/drowing" element={<DrawingCanvas />} />
    </Routes>
  );
}

export default App;