import React, { useState, useEffect } from "react";
import "./EndingCollection.css";

// Meta ข้อมูลที่ใช้แสดงผลตามประเภทตอนจบแบบเดียวกับหน้าตั้งค่า
const endingTypeMeta = {
  good: { label: "Good Ending", icon: "🌸", className: "good" },
  bad: { label: "Bad Ending", icon: "💀", className: "bad" },
  true: { label: "True Ending", icon: "👑", className: "true" },
  secret: { label: "Secret Ending", icon: "🌙", className: "secret" },
  unknown: { label: "Ending", icon: "📖", className: "unknown" },
};

export default function EndingCollection({ isOpen, endings, onClose, onViewStoryMap }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const endingsList = Array.isArray(endings) ? endings : [];

  // ❌ กรองแสดงผล: "Ending ที่ยังไม่เจอ ไม่ต้องแสดง" (เอาเฉพาะที่ค้นพบแล้วเท่านั้น)
  const unlockedEndings = endingsList.filter((item) => item?.is_unlocked);

  // 🔄 สร้างหมวดหมู่ตัวกรองแบบ Flow ไดนามิก (ถ้าค้นพบประเภทไหน ตัวกรองปุ่มนั้นถึงจะค่อยๆ โผล่ขึ้นมา)
  const getDynamicFilters = () => {
    const baseFilters = [{ value: "all", label: "ทั้งหมด" }];

    // เช็กว่าในบรรดาฉากจบที่พบ มีประเภทเหล่านี้อยู่ไหม
    const hasType = (type) => unlockedEndings.some(item => (item?.ending_type || item?.type) === type);

    if (hasType("good")) baseFilters.push({ value: "good", label: "Good Ending" });
    if (hasType("bad")) baseFilters.push({ value: "bad", label: "Bad Ending" });
    if (hasType("true")) baseFilters.push({ value: "true", label: "True Ending" });
    if (hasType("secret")) baseFilters.push({ value: "secret", label: "Secret Ending" });

    return baseFilters;
  };

  const currentFilters = getDynamicFilters();

  // กรองรายการที่จะนำมาแสดงใน Grid
  const visibleEndings = unlockedEndings.filter((item) =>
    filter === "all" ? true : (item?.ending_type || item?.type) === filter
  );

  useEffect(() => {
    if (!isOpen) {
      setFilter("all");
      setSelected(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="ending-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ending-modal">
        <button className="ending-modal__close" type="button" onClick={onClose}>×</button>

        <header className="ending-modal__header">
          <div>
            {/* ✅ เปลี่ยนเป็น "คลังฉากจบ" */}
            <p className="ending-modal__subtitle">คลังฉากจบ</p>
            {/* ✅ เปลี่ยนเป็น "ค้นพบ" */}
            <h2>รวมฉากจบที่ค้นพบแล้ว</h2>
            <p className="ending-modal__description">ดูเฉพาะฉากจบที่คุณค้นพบแล้วเท่านั้น</p>
          </div>
          {/* ❌ เอา Progress และ Progress Bar ออกเรียบร้อยตามสั่ง */}
        </header>

        {/* ✅ คลีนอัปปุ่ม Filter ใช้โครงสร้างเดิมแต่ปุ่มปรับตาม Flow */}
        <div className="ending-filter-buttons">
          {currentFilters.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`ending-filter-button ${filter === option.value ? "ending-filter-button--active" : ""}`}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* ✅ Main Grid */}
        <div className="ending-grid">
          {visibleEndings.length === 0 ? (
            <div className="ending-empty">ยังไม่มีฉากจบที่ค้นพบในหมวดนี้</div>
          ) : visibleEndings.map((ending) => {
            const key = ending.scene_id || ending.id;
            const typeKey = ending.ending_type || ending.type || "unknown";
            const meta = endingTypeMeta[typeKey] || endingTypeMeta.unknown;
            const title = ending.ending_title || ending.title || "ฉากจบไม่ได้ตั้งชื่อ";
            const hasDesc = ending.ending_description || ending.endingDescription || ending.description;

            return (
              <button
                key={key}
                type="button"
                // ✅ ใช้ธีมสีตามกรอบคลาสเดียวกับหน้า EndingSettings (good, bad, true, secret)
                className={`ending-card ${meta.className}`}
                onClick={() => setSelected(ending)}
              >
                {/* ✅ โครงสร้างสไตล์เดียวกับ EndingSettings: จัดกลาง, ไอคอนใหญ่บน, แถบประเภทตามมา */}
                <div className="ending-card__icon">{meta.icon}</div>
                <div className="ending-card__label">{meta.label}</div>
                <h4 className="ending-card__title">{title}</h4>
                
                {/* 🌟 ซ่อน tag p ไปเลยถ้าไม่มีข้อมูลคำอธิบาย การ์ดจะหดสั้นสวยงามและคลีนขึ้น */}
                {hasDesc && (
                  <p className="ending-card__meta">
                    {hasDesc}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* Popup รายละเอียดเมื่อกดการ์ด */}
        {selected && (
          <div className="ending-detail-popup" onClick={() => setSelected(null)}>
            <div className="ending-detail-popup__content" onClick={(e) => e.stopPropagation()}>
              <div className="ending-detail-popup__header">
                <div className="ending-detail-popup__icon">
                  {endingTypeMeta[selected.ending_type || selected.type || "unknown"].icon}
                </div>
                <span className="ending-detail-popup__type">
                  {endingTypeMeta[selected.ending_type || selected.type || "unknown"].label}
                </span>
                <h3 className="ending-detail-popup__title">{selected.ending_title || selected.title}</h3>
                
                {/* 🌟 ซ่อนช่องคำอธิบายในหน้าต่างดีเทลด้วยเช่นกันหากนักเขียนไม่ได้ระบุไว้ */}
                {(selected.ending_description || selected.endingDescription || selected.description) && (
                  <p className="ending-detail-popup__desc">
                    {selected.ending_description || selected.endingDescription || selected.description}
                  </p>
                )}
              </div>

              <div className="ending-detail-popup__body">
                <div className="ending-detail-popup__meta-row">
                  <div>
                    {/* ✅ เปลี่ยนคำประกาศเป็น "ค้นพบเมื่อ" */}
                    <span>ค้นพบเมื่อ </span>
                    <strong>{(() => {
                      const unlockedAtRaw = selected.unlocked_at || selected.unlockedAt || selected.reached_at;
                      if (!unlockedAtRaw) return "ไม่ระบุ";
                      const parsedDate = new Date(unlockedAtRaw);
                      return Number.isNaN(parsedDate.getTime()) ? unlockedAtRaw : parsedDate.toLocaleDateString();
                    })()}</strong>
                  </div>
                </div>

                <div className="ending-detail-popup__actions">
                  <button
                    type="button"
                    className="ending-detail-popup__button ending-detail-popup__button--primary"
                    onClick={() => onViewStoryMap?.(selected.scene_id || selected.id)}
                  >
                    แผนผังการอ่าน
                  </button>
                  <button type="button" className="ending-detail-popup__button ending-detail-popup__button--secondary" onClick={() => setSelected(null)}>
                    กลับคลังฉากจบ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
