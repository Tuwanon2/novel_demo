import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./HistoryPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const STATUS_MAP = {
  reading: { label: "กำลังอ่าน", color: "#D02676", bg: "#FDF2F8", dot: "#D02676" },
  finished: { label: "อ่านจบแล้ว", color: "#059669", bg: "#ECFDF5", dot: "#10B981" },
};

const normalizeCategoryName = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return String(value.name || value.title || value.label || value.label_th || "").trim();
};

const stripHtml = (html = "") => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
};

const extractChapterAndSceneFromTitle = (title) => {
  if (!title || typeof title !== "string") return { chapter: null, scene: null };
  const chapterMatch = title.match(/ตอนที่\s*(\d+)/i) || title.match(/ตอน\s*(\d+)/i) || title.match(/chapter\s*(\d+)/i);
  const sceneMatch =
    title.match(/ฉากที่\s*(\d+)/i) ||
    title.match(/scene\s*(\d+)/i) ||
    title.match(/ตอนที่\s*\d+\s*[·\-:]\s*ฉากที่\s*(\d+)/i);
  return {
    chapter: chapterMatch ? parseInt(chapterMatch[1], 10) : null,
    scene: sceneMatch ? parseInt(sceneMatch[1], 10) : null,
  };
};

const normalizeBook = (item) => ({
  id: item.novel_id || item.id, 
  title: item.title || "ไม่ระบุชื่อเรื่อง",
  author: item.author_name || item.pen_name || "ไม่ทราบผู้แต่ง",
  categories: Array.isArray(item.categories) 
    ? item.categories.map(c => typeof c === 'object' ? c.name : c) 
    : ["ทั่วไป"],
  coverImage: item.cover_image || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=320&q=80",
  synopsis: stripHtml(item.captions || item.introduction || ""),
  reading_status: item.reading_status || "reading",
  routeFound: item.visited_count || 0,
  totalRoutes: item.total_scenes || item.scene_count || 0,
  endingCount: item.ending_count || 0,
  totalEndings: item.total_endings || 0,
  
  lastReadAt: (item.last_read_at && !item.last_read_at.startsWith("0001")) 
    ? item.last_read_at 
    : item.updated_at || item.created_at || new Date().toISOString(),

  // 🎯 สลับเอากลุ่ม current_ ขึ้นก่อน เพื่อเคารพค่าปัจจุบันที่กดมาจากหน้าผังนิยาย
  lastReadChapterNumber: item.current_chapter_number || item.last_read_chapter_number || null,
  lastReadChapterTitle: item.current_chapter_title || item.last_read_chapter_title || null,
  lastReadSceneNumber: item.current_scene_number || item.last_read_scene_number || null,
  lastReadSceneName: item.current_scene_name || item.current_scene_title || item.last_read_scene_name || item.last_read_scene_title || null,
  
  // 💎 คงทางเลือกก่อนหน้าไว้เหมือนเดิม ไม่แตะต้องลอจิกส่วนนี้
  lastChoiceText: item.last_choice_text || null,
  
  // ยึดเลขฉากปัจจุบันจากการย้อนผังเป็นหลัก
  currentSceneId: item.current_scene_id || item.scene_id || item.last_read_scene_id || 0,
});

const HistoryPage = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        const historyUrl = `${API_BASE_URL}/history`;
        const historyRes = await axios.get(historyUrl, { headers });
        const historyPayload =
          historyRes.data?.data?.history ||
          historyRes.data?.history ||
          historyRes.data?.novels ||
          historyRes.data ||
          [];
        const bookList = Array.isArray(historyPayload) ? historyPayload : [];

        if (active) {
          setBooks(bookList.map(normalizeBook));
        }
      } catch (err) {
        console.error("History API error:", err);
        if (active) setBooks([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadHistory();

    window.addEventListener("focus", loadHistory);

    return () => {
      active = false;
      window.removeEventListener("focus", loadHistory);
    };
  }, []);

  const filteredBooks = useMemo(() => {
    if (filter === "all") return books;
    return books.filter((book) => book.reading_status === filter);
  }, [books, filter]);

  const statusCounts = {
    reading: books.filter((book) => book.reading_status === "reading").length,
    finished: books.filter((book) => book.reading_status === "finished").length,
  };

  const statusOptions = [
    { key: "all", label: "ทั้งหมด" },
    { key: "reading", label: "กำลังอ่าน" },
    { key: "finished", label: "อ่านจบ" },
  ];

  const formatRelative = (iso) => {
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.max(1, Math.floor(diff / 3600))} ชั่วโมงที่แล้ว`;
    if (diff < 604800) return `${Math.max(1, Math.floor(diff / 86400))} วันที่แล้ว`;
    return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="history-page">
      <div className="history-page__sticky-header">
        <div className="history-page__top">
          <div className="history-page__labels">
            <div className="history-page__eyebrow">ประวัติการอ่านของฉัน</div>
            <div className="history-page__title">นิยายที่คุณเคยอ่าน</div>
          </div>
          <div className="history-page__count">ทั้งหมด {books.length} เรื่อง</div>
        </div>
      </div>

      <div className="history-page__container">
        <div className="history-page__filters">
          {statusOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`history-page__filter-button ${filter === option.key ? "active" : ""}`}
              onClick={() => setFilter(option.key)}
            >
              {option.label}
              {option.key !== "all" && ` · ${statusCounts[option.key]}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="history-page__loading">กำลังโหลดประวัติการอ่าน...</div>
        ) : filteredBooks.length === 0 ? (
          <div className="history-page__empty">
            <div className="history-page__empty-emoji">📚</div>
            <div className="history-page__empty-title">ยังไม่มีประวัติการอ่าน</div>
            <div>นิยายที่คุณอ่านจะถูกบันทึกไว้ที่นี่</div>
          </div>
        ) : (
          <div className="history-page__grid">
            {filteredBooks.map((book) => {
              const status = STATUS_MAP[book.reading_status] || STATUS_MAP.reading;
              const percent = book.totalRoutes ? Math.round((book.routeFound / book.totalRoutes) * 100) : 0;
              const chapterLabel = book.lastReadChapterTitle
  ? `ตอนที่ ${book.lastReadChapterNumber || "?"} : ${book.lastReadChapterTitle}`
  : book.lastReadChapterNumber
  ? `ตอนที่ ${book.lastReadChapterNumber}`
  : book.isMismatched
  ? "กำลังอ่าน (ย้อนไทม์ไลน์)"
  : "ยังไม่ระบุตอน";
              
              const scNum = 
                book.lastReadSceneNumber || 
                book.currentSceneId ||
                book.sceneNumber || 
                book.scene_number || 
                book.scene_index || 
                book.lastReadParsed?.scene || 
                book.last_read_scene_number;
              
              const sceneTitle = book.lastReadSceneName || book.lastReadSceneTitle;
              const finalSceneTitle = (sceneTitle && !sceneTitle.includes("ตอนที่")) ? sceneTitle : null;

              const sceneLabel = book.lastReadSceneName
  ? (book.lastReadSceneNumber ? `ฉากที่ ${book.lastReadSceneNumber} : ${book.lastReadSceneName}` : book.lastReadSceneName)
  : book.lastReadSceneNumber
  ? `ฉากที่ ${book.lastReadSceneNumber}`
  : book.isMismatched
  ? `ฉากปัจจุบัน (ไอดี: ${book.currentSceneId})`
  : "ยังไม่ระบุฉาก";

              return (
                <div key={book.id || `${book.title}-${book.author}`} className="history-card">
                  <div className="history-card__cover">
                    {book.coverImage ? (
                      <img src={book.coverImage} alt={book.title} />
                    ) : (
                      <div className="history-card__cover-placeholder">
                        {String(book.title || "-").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="history-card__main">
                    <div className="history-card__header">
                      <div className="history-card__heading">
                        <div className="history-card__title">{book.title}</div>
                        <div className="history-card__author">{book.author}</div>
                      </div>
                      <span className={`history-card__status history-card__status--${book.reading_status}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="history-card__categories">
                      {book.categories.slice(0, 2).map((category, index) => (
                        <span key={`${category}-${index}`} className="history-card__tag">
                          {category}
                        </span>
                      ))}
                    </div>

                    <div className="history-card__info">
                      <div className="history-card__info-item">
                        <div className="history-card__info-label">ตอนล่าสุด</div>
                        <div>{chapterLabel}</div>
                      </div>
                      <div className="history-card__info-item">
                        <div className="history-card__info-label">ฉากล่าสุด</div>
                        <div>{sceneLabel}</div>
                      </div>
                      
                      {book.lastChoiceText ? (
                        <div className="history-card__info-item history-card__info-item--full">
                          <div className="history-card__info-label">ทางเลือกก่อนหน้า</div>
                          <div className="history-card__choice-text">{book.lastChoiceText}</div>
                        </div>
                      ) : null}
                      
                      <div className="history-card__info-item">
                        <div className="history-card__info-label">ตอนจบที่ค้นพบ</div>
                        <div>
                          {book.totalEndings > 0 
                            ? `${book.endingCount}/${book.totalEndings}`
                            : book.reading_status === "finished"
                            ? `${book.endingCount}/${book.endingCount}`
                            : `${book.endingCount}/?`}
                        </div>
                      </div>
                      <div className="history-card__info-item">
                        <div className="history-card__info-label">อ่านล่าสุด</div>
                        <div>{formatRelative(book.lastReadAt)}</div>
                      </div>
                    </div>

                    <div className="history-card__progress">
                      <div className="history-card__progress-meta">
                        <span>ความคืบหน้า</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="history-card__progress-bar">
                        <div className="history-card__progress-fill" style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="history-card__continue-btn"
                      onClick={() => {
                        const targetScene = book.currentSceneId;
                        
                        // 🎯 ปรับปรุงความปลอดภัย: บังคับเปลี่ยนผ่าน URL ของระบบ Router ของเว็บโดยตรงคู่ขนานไปด้วย
                        // เพื่อให้ React Router ประมวลผลดึง useParams() ส่งไปให้ ReadingPage ทันที 
                        if (targetScene && targetScene !== 0) {
                          navigate(`/reading/${book.id}/${targetScene}`);
                        } else {
                          navigate(`/reading/${book.id}`);
                        }
                      }}
                    >
                      อ่านต่อ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
