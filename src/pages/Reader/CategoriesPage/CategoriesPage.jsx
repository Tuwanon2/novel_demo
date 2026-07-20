import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import NovelCard from "../../../components/NovelCard/NovelCard";
import CategoryCard from "../../../components/CategoryCard/CategoryCard";
import { getNovelStatusInfo } from "../../../utils/novelStatus";
import "./CategoriesPage.css";
import { API_BASE_URL } from "../../../utils/api.js";

const categoryPalettes = [
  { name: "แฟนตาซี",        icon: "🪄", bg: "linear-gradient(135deg,#ffe4f0,#ffd6eb)" },
  { name: "โรแมนซ์",         icon: "💘", bg: "linear-gradient(135deg,#fed7e2,#fbcfe8)" },
  { name: "แอคชัน",          icon: "⚔️", bg: "linear-gradient(135deg,#fde8ff,#f3e0fc)" },
  { name: "สยองขวัญ",        icon: "👻", bg: "linear-gradient(135deg,#f0f0ff,#e8e8ff)" },
  { name: "ลึกลับ",           icon: "🕵️", bg: "linear-gradient(135deg,#fdf2f8,#fce7f3)" },
  { name: "ชีวิตประจำวัน",   icon: "☕", bg: "linear-gradient(135deg,#fff1f2,#ffe4e6)" },
  { name: "ดราม่า",           icon: "🎭", bg: "linear-gradient(135deg,#fef9e0,#fef3c7)" },
  { name: "Sci-Fi",           icon: "🚀", bg: "linear-gradient(135deg,#e0f2fe,#bfdbfe)" },
];

const normalizeCategoryName = (c) => {
  if (!c) return "";
  if (typeof c === "string") return c.trim();
  return String(c.name || c.Title || c.title || c.label || "").trim();
};

const normalizeNovel = (data) => {
  const rawCats = data.categories ?? data.Categories ?? data.category_ids ?? data.CategoryIDs ?? [];
  const statusInfo = getNovelStatusInfo(data);
  return {
    id: data.id || data.novel_id,
    title: data.title || "ไม่มีชื่อเรื่อง",
    categories: Array.isArray(rawCats) ? rawCats.map(normalizeCategoryName).filter(Boolean) : [],
    coverImage: data.cover_image || data.coverImage || null,
    coverEmoji: !data.cover_image && !data.coverImage ? "📘" : "",
    synopsis: data.captions || data.introduction || data.description || "",
    author: {
      displayName: data.author_name || data.pen_name || "ไม่ทราบผู้แต่ง",
      avatarEmoji: "✍️",
    },
    stats: {
      views:   data.views || data.view_count || 0,
      likes:   data.like_count || 0,
      endings: data.endings || data.endings_count || 0,
    },
    isLiked:      data.is_liked || false,
    isBookmarked: data.is_bookmarked || false,
    // ใช้สำหรับ filter — นับเฉพาะที่ published
    isPublished: statusInfo.isPublished || statusInfo.mode === "published",
  };
};

// ─── Skeleton components ────────────────────────────────────────────────────
const CategorySkeleton = () => (
  <div className="cat-page__category-skeleton">
    <div className="cat-page__sk cat-page__sk--icon" />
    <div className="cat-page__sk cat-page__sk--title" />
    <div className="cat-page__sk cat-page__sk--count" />
  </div>
);

const NovelSkeleton = () => (
  <div className="cat-page__novel-skeleton">
    <div className="cat-page__sk cat-page__sk--cover" />
    <div style={{ padding: "10px" }}>
      <div className="cat-page__sk cat-page__sk--line cat-page__sk--med" />
      <div className="cat-page__sk cat-page__sk--line cat-page__sk--short" />
    </div>
  </div>
);

// ─── Main ───────────────────────────────────────────────────────────────────
const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [novels, setNovels]         = useState([]);
  const [activeCategory, setActive] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    let active = true;
    try {
      const [catRes, novelRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/categories`),
        axios.get(`${API_BASE_URL}/novels`),
      ]);
      if (!active) return;

      const catData   = catRes.data?.data || catRes.data || [];
      const novelData = novelRes.data?.data?.novels
                     || novelRes.data?.novels
                     || novelRes.data?.data
                     || novelRes.data
                     || [];

      const allNovels    = Array.isArray(novelData) ? novelData.map(normalizeNovel) : [];
      // ─── Bug fix: นับเฉพาะนิยายที่ published ───────────────────────────────
      const publishedNovels = allNovels.filter(n => n.isPublished);

      // นับ count จาก published เท่านั้น
      const counts = {};
      publishedNovels.forEach(n => {
        n.categories.forEach(name => {
          counts[name] = (counts[name] || 0) + 1;
        });
      });

      const dbCats = Array.isArray(catData)
        ? catData.map(c => ({ id: c.category_id || c.id, name: c.name || c.title || "" }))
        : [];

      const merged = dbCats.map(dbCat => {
        const palette = categoryPalettes.find(p => p.name === dbCat.name);
        return {
          id:         dbCat.id,
          name:       dbCat.name,
          icon:       palette?.icon       || "📚",
          background: palette?.bg || "linear-gradient(135deg,#fff1f2,#ffe4e6)",
          // แสดงเฉพาะจำนวนที่ published
          count:      counts[dbCat.name]  || 0,
        };
      });

      setNovels(publishedNovels);   // เก็บเฉพาะ published ไว้แสดง
      setCategories(merged);
    } catch (err) {
      console.error(err);
      if (active) setError("ไม่สามารถดึงข้อมูลได้ในขณะนี้");
    } finally {
      if (active) setLoading(false);
    }
    return () => { active = false; };
  };

  useEffect(() => { loadData(); }, []);

  // กรองนิยายตาม category ที่เลือก
  const filtered = useMemo(() => {
    if (!activeCategory) return novels;
    return novels.filter(n => n.categories.includes(activeCategory));
  }, [activeCategory, novels]);

  const handleCategoryClick = (name) => {
    setActive(prev => prev === name ? null : name); // toggle
  };

  return (
    <div className="cat-page">

      {/* ── Hero ── */}
      <section className="cat-page__hero">
        <div className="cat-page__hero-inner">
          <span className="cat-page__eyebrow">✨ สำรวจนิยายตามหมวดหมู่</span>
          <h1 className="cat-page__title">หมวดหมู่นิยาย</h1>
          <p className="cat-page__subtitle">
            เลือกหมวดที่ชื่นชอบ แล้วค้นพบนิยายทางเลือกที่รอให้คุณอ่าน
          </p>
          {/* summary chips */}
          {!loading && !error && (
            <div className="cat-page__hero-summary">
              <span className="cat-page__summary-chip">📚 {novels.length} นิยาย</span>
              <span className="cat-page__summary-chip">🗂️ {categories.length} หมวดหมู่</span>
              <span className="cat-page__summary-chip">🏁 {novels.reduce((s,n)=>s+(n.stats.endings||0),0)} ตอนจบ</span>
            </div>
          )}
        </div>
      </section>

      <div className="cat-page__body">

        {/* ── Category grid ── */}
        <section className="cat-page__section">
          <div className="cat-page__category-grid">
            {loading
              ? Array.from({length:6}).map((_,i) => <CategorySkeleton key={i}/>)
              : error
                ? (
                  <div className="cat-page__error-box">
                    <div style={{fontSize:40,marginBottom:10}}>😵</div>
                    <p style={{fontWeight:700,color:"#EF4444",margin:"0 0 8px"}}>{error}</p>
                    <button className="cat-page__retry-btn" onClick={loadData}>ลองใหม่</button>
                  </div>
                )
                : categories.length === 0
                  ? <p className="cat-page__no-cat">ยังไม่มีหมวดหมู่ในระบบ</p>
                  : categories.map(cat => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      active={cat.name === activeCategory}
                      onClick={() => handleCategoryClick(cat.name)}
                    />
                  ))
            }
          </div>
        </section>

        {/* ── Novel list ── */}
        <section className="cat-page__section">
          {/* list header */}
          <div className="cat-page__list-header">
            <h2 className="cat-page__list-title">
              {activeCategory
                ? `🔮 นิยายหมวด "${activeCategory}"`
                : "📚 นิยายทั้งหมด"}
              {!loading && (
                <span className="cat-page__list-count">{filtered.length} เรื่อง</span>
              )}
            </h2>
            {activeCategory && (
              <button className="cat-page__clear-btn" onClick={() => setActive(null)}>
                ✕ ล้างตัวกรอง
              </button>
            )}
          </div>

          {/* skeletons */}
          {loading && (
            <div className="cat-page__novel-grid">
              {Array.from({length:8}).map((_,i) => <NovelSkeleton key={i}/>)}
            </div>
          )}

          {/* empty */}
          {!loading && filtered.length === 0 && (
            <div className="cat-page__empty">
              <div className="cat-page__empty-icon">🔍</div>
              <p className="cat-page__empty-title">
                {activeCategory
                  ? `ยังไม่มีนิยายในหมวด "${activeCategory}"`
                  : "ยังไม่มีนิยายในระบบ"}
              </p>
              <p className="cat-page__empty-sub">เป็นคนแรกที่สร้างนิยายในหมวดนี้ได้เลย</p>
              {activeCategory && (
                <button className="cat-page__clear-btn" style={{marginTop:14}} onClick={()=>setActive(null)}>
                  ดูนิยายทั้งหมด
                </button>
              )}
            </div>
          )}

          {/* grid */}
          {!loading && filtered.length > 0 && (
            <div className="cat-page__novel-grid">
              {filtered.map(n => (
                <NovelCard
                  key={n.id}
                  novel={n}
                  onClick={() => navigate(`/novel/${n.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CategoriesPage;