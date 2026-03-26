import type { DPadProps } from "../service/Cordicate-service";

export function DPad({ onUp, onDown, onLeft, onRight }: DPadProps): JSX.Element {
  const Btn = ({
    label,
    onClick,
  }: {
    label: string;
    onClick: () => void;
  }) => (
    <button
      onClick= { onClick }
  className = "w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 font-bold text-sm
  bg - [#1e293b] border border - slate - 600 / 40 hover: bg - sky - 900 / 60 hover: border - sky - 500 / 50
  hover: text - sky - 300 active: scale - 90 transition - all select - none shadow - md"
    >
    { label }
    </button>
  );

 
}