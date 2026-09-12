import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

const Overview = lazy(() => import("./pages/Overview"));
const Home = lazy(() => import("./pages/Home"));
const Room = lazy(() => import("./pages/Room"));
const Preview = lazy(() => import("./pages/Preview"));
const MapPreview = lazy(() => import("./pages/MapPreview"));
const SoloBpSetup = lazy(() => import("./pages/SoloBpSetup"));
const SoloBpBoard = lazy(() => import("./pages/SoloBpBoard"));
const MovementTraining = lazy(() => import("./pages/MovementTraining"));
const AimingTraining = lazy(() => import("./pages/AimingTraining"));
const OfflineTrainingGame = lazy(() => import("./pages/OfflineTrainingGame"));
const ControlLayoutEditor = lazy(() => import("./pages/ControlLayoutEditor"));

export default function App() {
  return (
    <>
      <Suspense fallback={<main className="page-loading">页面加载中…</main>}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/bp" element={<Home />} />
          <Route path="/room/:code" element={<Room />} />
          <Route path="/preview" element={<Preview />} />
          <Route path="/map-preview" element={<MapPreview />} />
          <Route path="/solo-bp" element={<SoloBpSetup />} />
          <Route path="/solo-bp/board" element={<SoloBpBoard />} />
          <Route path="/offline-training" element={<MovementTraining />} />
          <Route path="/offline-aiming" element={<AimingTraining />} />
          <Route path="/offline-training/game" element={<OfflineTrainingGame />} />
          <Route path="/control-layout/:kind" element={<ControlLayoutEditor />} />
        </Routes>
      </Suspense>
    </>
  );
}
