import React, { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  UploadCloud,
  Camera,
  Database,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

const applications = ["Application 001", "Application 002", "Application 003"];

const cameraFrames = ["Front Camera", "Rear Camera", "Side Camera"];

const dataInputs = ["CSV File", "JSON Data", "XML Data"];

interface SelectProps {
  label: string;
  icon: React.ReactNode;
  options: string[];
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

const AdvancedSelect: React.FC<SelectProps> = ({
  label,
  icon,
  options,
  value,
  placeholder,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, []);

  return (
    <div className="relative w-full" ref={ref}>
      <label className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[2px] text-slate-400">
        {icon}
        {label}
      </label>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-[72px] rounded-3xl border border-white/10 bg-white/[0.05] px-5 flex items-center justify-between backdrop-blur-xl hover:border-blue-400/30 transition"
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            {icon}
          </div>

          <span
            className={`text-lg ${value ? "text-white" : "text-slate-500"}`}
          >
            {value || placeholder}
          </span>
        </div>

        <ChevronDown
          className={`text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-4 w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0f172a] shadow-2xl">
          {options.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                onChange(item);
                setOpen(false);
              }}
              className="w-full border-b border-white/5 px-6 py-5 text-left text-slate-200 hover:bg-blue-500/10 hover:text-blue-300 transition"
            >
              <div className="flex items-center justify-between">
                <span>{item}</span>

                {value === item && (
                  <CheckCircle2 className="text-blue-400" size={18} />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const UploadConfigAdvanced: React.FC = () => {
  const [application, setApplication] = useState("");
  const [cameraFrame, setCameraFrame] = useState("");
  const [dataInput, setDataInput] = useState("");

  // FILE STATE
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // FILE INPUT REF
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // HANDLE FILE SELECT
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      setSelectedFile(file);
      console.log("Selected File:", file);
    }
  };

  // OPEN FILE PICKER
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // APPLY BUTTON
  const handleApply = () => {
    console.log({
      application,
      cameraFrame,
      dataInput,
      selectedFile,
    });
  };

  return (
    <div className="min-h-screen bg-[#020617] overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-[-150px] left-[-150px] w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[120px]" />

      <div className="absolute bottom-[-150px] right-[-150px] w-[400px] h-[400px] bg-cyan-500/20 rounded-full blur-[120px]" />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-7xl rounded-[40px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl overflow-hidden shadow-2xl">
          <div className="grid lg:grid-cols-2">
            {/* LEFT SIDE */}
            <div className="p-10 lg:p-14 border-r border-white/10">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-3xl bg-blue-500/20 flex items-center justify-center border border-blue-400/20">
                  <Sparkles className="text-blue-400" size={30} />
                </div>

                <div>
                  <h1 className="text-5xl font-bold text-white">
                    AI Configurator
                  </h1>

                  <p className="mt-2 text-slate-400">
                    Smart upload & system setup
                  </p>
                </div>
              </div>

              {/* Upload Card */}
              <div className="mt-14">
                <div className="rounded-[36px] border border-dashed border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 p-10 text-center">
                  <div className="flex justify-center">
                    <div className="w-28 h-28 rounded-full bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
                      <UploadCloud size={54} className="text-blue-400" />
                    </div>
                  </div>

                  <h2 className="mt-8 text-3xl font-bold text-white">
                    Upload System Logs
                  </h2>

                  <p className="mt-4 text-slate-400 max-w-lg mx-auto">
                    Upload log files for AI processing and advanced analytics.
                  </p>

                  {/* Hidden Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {/* Browse Button */}
                  <button
                    type="button"
                    onClick={handleBrowseClick}
                    className="mt-8 rounded-2xl bg-blue-500 px-8 py-4 text-lg font-semibold text-white transition hover:bg-blue-600 hover:scale-[1.02]"
                  >
                    Browse Files
                  </button>

                  {/* File Name */}
                  {selectedFile && (
                    <div className="mt-6 rounded-2xl border border-green-400/20 bg-green-500/10 p-4 text-left">
                      <p className="text-green-300 font-medium">
                        Selected File
                      </p>

                      <p className="mt-1 text-sm text-slate-300 break-all">
                        {selectedFile.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="p-10 lg:p-14">
              <div>
                <p className="text-sm uppercase tracking-[3px] text-blue-400">
                  Configuration
                </p>

                <h2 className="mt-4 text-5xl font-bold text-white leading-tight">
                  System Setup
                </h2>

                <p className="mt-5 text-slate-400">
                  Configure application, camera frame, and data source settings.
                </p>
              </div>

              <div className="mt-12 space-y-8">
                <AdvancedSelect
                  label="Application"
                  icon={<Sparkles size={18} />}
                  options={applications}
                  value={application}
                  placeholder="Select application"
                  onChange={setApplication}
                />

                <AdvancedSelect
                  label="Camera Frame"
                  icon={<Camera size={18} />}
                  options={cameraFrames}
                  value={cameraFrame}
                  placeholder="Select camera frame"
                  onChange={setCameraFrame}
                />

                <AdvancedSelect
                  label="Data Source"
                  icon={<Database size={18} />}
                  options={dataInputs}
                  value={dataInput}
                  placeholder="Select data source"
                  onChange={setDataInput}
                />
              </div>

              {/* Summary */}
              <div className="mt-10 rounded-[30px] border border-white/10 bg-white/[0.04] p-6">
                <h3 className="text-lg font-semibold text-white">
                  Current Configuration
                </h3>

                <div className="mt-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Application</span>

                    <span className="text-white">{application || "--"}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Camera</span>

                    <span className="text-white">{cameraFrame || "--"}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Data Source</span>

                    <span className="text-white">{dataInput || "--"}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">File</span>

                    <span className="text-white truncate max-w-[220px]">
                      {selectedFile?.name || "--"}
                    </span>
                  </div>
                </div>
              </div>

              {/* APPLY BUTTON */}
              <button
                onClick={handleApply}
                className="mt-10 w-full h-[78px] rounded-3xl bg-blue-500 text-xl font-bold text-white transition hover:bg-blue-600 hover:scale-[1.01]"
              >
                Apply Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadConfigAdvanced;
