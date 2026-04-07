import type { JSX } from "react";
import type {
  DataPoint,
  LineSegment,
  Stats,
} from "../service/Cordicate-service";
import { SegmentsTab } from "./tabs/SegmentsTab";
import { DataInputTab } from "./tabs/DataInputTab";
import { GridTab } from "./tabs/GridTab";
import { AddPointTab } from "./tabs/AddPointTab";

type Tab = "segments" | "data" | "grid" | "add";

interface Props {
  /* tab state */
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;

  /* data */
  dataPoints: DataPoint[];
  filteredPoints: DataPoint[];
  lineSegments: LineSegment[];
  stats: Stats | null;

  /* segments tab */
  segInput: string;
  setSegInput: (v: string) => void;
  showSegments: boolean;
  setShowSegments: (v: boolean) => void;
  onPlotSegments: () => void;
  onClearSegments: () => void;

  /* data input tab */
  dataInput: string;
  setDataInput: (v: string) => void;
  onPlotData: () => void;
  onClearData: () => void;

  /* grid tab */
  selectedRows: Set<number>;
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<number>>>;
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  lastClicked: number;
  setLastClicked: (i: number) => void;
  confMin: number;
  confMax: number;
  areaMin: number;
  areaMax: number;
  areaAbsMax: number;
  showOnlyRejected: boolean;
  manualPoints?: import("../service/Cordicate-service").ManualPoint[];
  manualLines?: import("../service/Cordicate-service").ManualLine[];
  setManualPoints?: (pts: import("../service/Cordicate-service").ManualPoint[]) => void;
  setManualLines?: (lines: import("../service/Cordicate-service").ManualLine[]) => void;
}

export function BottomPanel(props: Props): JSX.Element {
  const {
    activeTab, setActiveTab,
    dataPoints, filteredPoints, lineSegments, stats,
    segInput, setSegInput, showSegments, setShowSegments, onPlotSegments, onClearSegments,
    dataInput, setDataInput, onPlotData, onClearData,
    selectedRows, setSelectedRows,
    activeIdx, setActiveIdx,
    lastClicked, setLastClicked,
    confMin, confMax, areaMin, areaMax, areaAbsMax,
    showOnlyRejected,
  } = props;
  const { manualPoints, manualLines, setManualPoints, setManualLines } = props as any;

  const tabs: [Tab, string][] = [
    ["segments", "📐 Segments"],
    ["data", "📋 Data Input"],
    ["grid", `📊 Grid${dataPoints.length ? ` · ${dataPoints.length}` : ""}`],
    ["add", `➕ Add`],
  ];

  return (
    <div
      style={{
        flexShrink: 0, display: "flex", flexDirection: "column",
        borderTop: "1.5px solid #e2e8f0", height: 268, background: "#f8fafc",
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: "flex", flexShrink: 0, alignItems: "center",
          background: "#fff", borderBottom: "1.5px solid #e2e8f0", paddingLeft: 4,
        }}
      >
        {tabs.map(([key, label]) => (
          <button
            key={key}
            className={`cp-tab ${activeTab === key ? "on" : ""}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "segments" && (
        <SegmentsTab
          segInput={segInput}
          setSegInput={setSegInput}
          lineSegments={lineSegments}
          showSegments={showSegments}
          setShowSegments={setShowSegments}
          onPlot={onPlotSegments}
          onClear={onClearSegments}
        />
      )}

      {activeTab === "data" && (
        <DataInputTab
          dataInput={dataInput}
          setDataInput={setDataInput}
          onPlot={onPlotData}
          onClear={onClearData}
          stats={stats}
        />
      )}

      {activeTab === "grid" && (
        <GridTab
          dataPoints={dataPoints}
          filteredPoints={filteredPoints}
          selectedRows={selectedRows}
          setSelectedRows={setSelectedRows}
          activeIdx={activeIdx}
          setActiveIdx={setActiveIdx}
          lastClicked={lastClicked}
          setLastClicked={setLastClicked}
          confMin={confMin}
          confMax={confMax}
          areaMin={areaMin}
          areaMax={areaMax}
          areaAbsMax={areaAbsMax}
          showOnlyRejected={showOnlyRejected}
        />
      )}
      {activeTab === "add" && (
        <AddPointTab
          manualPoints={manualPoints}
          manualLines={manualLines}
          setManualPoints={setManualPoints}
          setManualLines={setManualLines}
        />
      )}
      
    </div>
  );
}
