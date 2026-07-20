import React from "react";
import "./EndingSettings.css";

const TYPES = [
  {
    value: "good",
    icon: "🌸",
    label: "Good Ending",
    hint: "ฉากจบที่ตัวละครมีความสุขหรือประสบความสำเร็จ",
    className: "good",
  },
  {
    value: "bad",
    icon: "💀",
    label: "Bad Ending",
    hint: "ฉากจบที่หม่นหมอง ตัวละครพบกับความสูญเสียหรือความล้มเหลว",
    className: "bad",
  },
  {
    value: "true",
    icon: "👑",
    label: "True Ending",
    hint: "ฉากจบที่แท้จริง เปิดเผยปมและบทสรุปทั้งหมดของเรื่องราว",
    className: "true",
  },
  {
    value: "secret",
    icon: "🌙",
    label: "Secret Ending",
    hint: "ฉากจบลับที่ซ่อนอยู่หลังตัวเลือกพิเศษ",
    className: "secret",
  },
];

export default function EndingSettings({
  sceneTitle = "แสงสุดท้ายแห่งอาณาจักร",
  isEnding = true,
  endingTitle = "",
  endingType = "true",
  endingDescription = "",
  endingDescriptionEnabled = false,
  onToggleEnding,
  onToggleEndingDescriptionEnabled,
  onChangeEndingTitle,
  onChangeEndingType,
  onChangeEndingDescription,
  onSave,
  onClose,
}) {
  const [descriptionEnabled, setDescriptionEnabled] = React.useState(
    Boolean(endingDescriptionEnabled || endingDescription)
  );

  React.useEffect(() => {
    setDescriptionEnabled(Boolean(endingDescriptionEnabled || endingDescription));
  }, [endingDescriptionEnabled, endingDescription]);

  const handleToggleDescription = () => {
    const next = !descriptionEnabled;
    setDescriptionEnabled(next);
    onToggleEndingDescriptionEnabled?.(next);
  };

  const current = TYPES.find((t) => t.value === endingType) || TYPES[0];
  const previewTitle = endingTitle.trim() || sceneTitle;

  return (
    <div className="ending-page">
      <div className="ending-card">
        {/* 1. Header & Main Toggle */}
        <div className="ending-header">
          <div className="ending-header-text">
            <h3>🏁 ฉากจบ</h3>
            <p>บันทึกฉากนี้ลงในคลังฉากจบของนักอ่าน</p>
          </div>

          <div className="header-toggle">
            <span className="header-toggle-label">ใช้เป็นฉากจบ</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={isEnding}
                onChange={() => onToggleEnding?.(!isEnding)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        {isEnding && (
          <>
            {/* 2. Preview - ลำดับและดีไซน์แบบเดียวกับหน้าคลังฉากจบ */}
            <div className="section">
              <label>ตัวอย่างคลังฉากจบ</label>
              
              <div className={`preview-card ${current.className}`}>
                <div className="preview-icon">{current.icon}</div>
                
                <div className="badge">{current.label}</div>

                <h4>{previewTitle}</h4>

                <p className="preview-description">
                  {descriptionEnabled
                    ? endingDescription.trim() || "ยังไม่มีคำอธิบายตอนจบ"
                    : "คำอธิบายตอนจบจะไม่แสดงหากปิดการใช้งาน"}
                </p>

                <small>
                  จะแสดงใน คลังฉากจบ หลังจากนักอ่านค้นพบฉากจบนี้
                </small>
              </div>
            </div>

            {/* 3. ประเภทฉากจบ */}
            <div className="section">
              <label>ประเภทฉากจบ</label>
              <div className="type-grid">
                {TYPES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`type-card ${
                      endingType === item.value ? "active" : ""
                    }`}
                    onClick={() => onChangeEndingType?.(item.value)}
                  >
                    <div className="icon">{item.icon}</div>
                    <div>{item.label}</div>
                  </button>
                ))}
              </div>
              <div className="type-hint">{current.hint}</div>
            </div>

            {/* 4. ชื่อฉากจบ */}
            <div className="section">
              <label>
                ชื่อฉากจบ
                <span className="optional">(เว้นว่างเพื่อใช้ชื่อฉาก)</span>
              </label>
              <input
                className="input"
                value={endingTitle}
                onChange={(e) => onChangeEndingTitle?.(e.target.value)}
                placeholder={sceneTitle}
              />
            </div>

            {/* 5. รายละเอียดฉากจบ & Toggle */}
            <div className="section toggle-row">
              <div className="toggle-row-text">
                <label>รายละเอียดฉากจบ</label>
                <p>แสดงข้อความเพิ่มเติมหลังปลดล็อก</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={descriptionEnabled}
                  onChange={handleToggleDescription}
                />
                <span className="slider" />
              </label>
            </div>

            {descriptionEnabled && (
              <div className="section no-border-top">
                <textarea
                  className="input"
                  style={{ minHeight: "80px", resize: "vertical" }}
                  value={endingDescription}
                  onChange={(e) => onChangeEndingDescription?.(e.target.value)}
                  placeholder="เขียนคำอธิบายเพิ่มเติมที่นี่..."
                />
              </div>
            )}

            {/* 6. ปุ่มบันทึก */}
            <div className="save-wrapper">
              <button className="save-btn" type="button" onClick={() => onSave?.()}>
                บันทึก
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
