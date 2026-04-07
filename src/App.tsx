import { Routes, Route } from "react-router-dom";
import { DrawingCanvas } from "./components/DrawingCanvas";
import CoordinatePlotter from "./page/CoordinatePlotter";

function App() {
  return (
    <Routes>
      <Route path="/" element={<CoordinatePlotter />} />
      <Route path="/drowing" element={<DrawingCanvas />} />
    </Routes>
  );
}

export default App;