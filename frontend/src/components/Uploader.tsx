import { useRef, useState, type DragEvent, type ChangeEvent } from "react";

interface Props {
  onSelect: (file: File) => void;
  previewUrl?: string | null;
}

export default function Uploader({ onSelect, previewUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }
    onSelect(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
  };

  return (
    <div
      className={`uploader ${dragOver ? "drag-over" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onInputChange}
        style={{ display: "none" }}
      />
      {previewUrl ? (
        <img src={previewUrl} alt="预览" className="uploader-preview" />
      ) : (
        <div className="uploader-hint">
          <div className="uploader-icon">📷</div>
          <div>点击选择图片，或拖拽到这里</div>
          <div className="uploader-sub">支持 PNG / JPG / WEBP</div>
        </div>
      )}
    </div>
  );
}
