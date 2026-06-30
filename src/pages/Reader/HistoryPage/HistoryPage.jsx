import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import GenreTag from "../../../components/GenreTag/GenreTag";
import "./HistoryPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const FILTER_OPTIONS = [
    { value: "all", label: "ทั้งหมด" },
    { value: "want_to_read", label: "อยากอ่าน" },
    { value: "reading", label: "กำลังอ่าน" },
    { value: "finished", label: "อ่านจบแล้ว" },
];


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

const normalizeBook = (item) => ({
    id:
        item.id ||
        item.novel_id ||
        item._id ||
        item.novel?.id,

    title:
        item.title ||
        item.novel?.title ||
        "ไม่ระบุชื่อเรื่อง",

    author:
        item.author_name ||
        item.author?.name ||
        item.novel?.author_name ||
        "ไม่ทราบผู้แต่ง",

    categories: Array.isArray(item.categories)
        ? item.categories.map(normalizeCategoryName)
        : ["ทั่วไป"],

    coverImage:
        item.cover_image ||
        item.coverImage ||
        item.novel?.cover_image ||
        "https://via.placeholder.com/320x420",

    synopsis: stripHtml(
        item.synopsis ||
        item.description ||
        item.introduction ||
        ""
    ),

    reading_status:
        item.reading_status ||
        item.status ||
        "want_to_read",

    routeFound:
        item.routeFound ||
        item.discoveredRoutes ||
        0,

    totalRoutes:
        item.totalRoutes ||
        item.total_paths ||
        0,
});

const statusLabels = {
    all: "ทั้งหมด",
    want_to_read: "อยากอ่าน",
    reading: "กำลังอ่าน",
    finished: "อ่านจบแล้ว",
};

const HistoryPage = () => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState("all");
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    const getCurrentUserId = () => {
        const userJson = localStorage.getItem("user");
        if (!userJson) return 0;
        try {
            const user = JSON.parse(userJson);
            return user?.id || user?.user_id || 0;
        } catch {
            return 0;
        }
    };

    useEffect(() => {
        let active = true;

        const loadhistory = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const userId = getCurrentUserId();
                const headers = { "Content-Type": "application/json" };
                if (token) headers.Authorization = `Bearer ${token}`;

                const historyUrl = `${API_BASE_URL}/history${userId ? `?user_id=${userId}` : ""}`;
                const shelfRes = await axios.get(historyUrl, { headers });
                const shelfPayload =
                    shelfRes.data?.data?.history ||
                    shelfRes.data?.history ||
                    shelfRes.data?.novels ||
                    shelfRes.data ||
                    [];
                let bookList = Array.isArray(shelfPayload) ? shelfPayload : [];

                if (bookList.length === 0) {
                    const novelRes = await axios.get(`${API_BASE_URL}/novels`, { headers });
                    const novelPayload =
                        novelRes.data?.data ||
                        novelRes.data?.novels ||
                        novelRes.data ||
                        [];
                    bookList = Array.isArray(novelPayload) ? novelPayload : [];
                }

                if (bookList.length === 0) {
                    throw new Error("empty");
                }

                if (active) {
                    setBooks(bookList.map(normalizeBook));
                }
            } catch {
                if (active) {
                    setBooks(history_MOCK_DATA.map(normalizeBook));
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        loadhistory();
        return () => {
            active = false;
        };
    }, []);

    const filteredBooks = useMemo(() => {
        if (filter === "all") return books;
        return books.filter((book) => book.reading_status === filter);
    }, [books, filter]);

    return (
        <div className="history-page">
            <div className="history-page__container">
                <header className="history-page__header">
                    <div>
                        <p className="history-page__eyebrow">ประวัติการอ่านของฉัน</p>
                        <h1 className="history-page__title">นิยายที่คุณเคยอ่าน</h1>
                        <p className="history-page__eyebrows">ติดตามความคืบหน้าและเส้นทางการอ่านของคุณ</p>
                    </div>

                    <div className="history-page__filter">
                        <label htmlFor="history-filter">กรองสถานะ</label>
                        <select
                            id="history-filter"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            {FILTER_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </header>

                {loading ? (
                    <div className="history-page__loading">กำลังโหลดประวัติการอ่าน...</div>
                ) : (
                    <>
                        <div className="history-page__summary">
                            <span>{filteredBooks.length} เรื่อง</span>
                            {filter !== "all" && (
                                <span className="history-page__summary-tag">
                                    {statusLabels[filter]}
                                </span>
                            )}
                        </div>

                        <div className="history-page__grid">
                            {filteredBooks.length === 0 ? (
                                <div className="history-page__empty">
                                    ไม่มีนิยายในสถานะนี้
                                </div>
                            ) : (
                                filteredBooks.map((book) => (
                                    <article
                                        key={book.id}
                                        className="history-card"
                                        onClick={() => navigate(`/novel/${book.id}`)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") navigate(`/novel/${book.id}`);
                                        }}
                                        tabIndex={0}
                                        role="button"
                                    >
                                        <div className="history-card__cover">
                                            <img src={book.coverImage} alt={`${book.title} ปกนิยาย`} />
                                        </div>
                                        <div className="history-card__body">
                                            <h2 className="history-card__title">{book.title}</h2>

                                            <p className="history-card__author">
                                                <span className="history-card__author-label">โดย </span>
                                                <span className="history-card__author-name">{book.author}</span>
                                            </p>

                                            <p className="history-card__description">
                                                {book.synopsis}
                                            </p>

                                            <div className="history-card__tags history-card__tags--small">
                                                {book.categories.slice(0, 3).map((category) => (
                                                    <GenreTag
                                                        key={`${book.id}-${category}`}
                                                        label={category}
                                                        variant="primary"
                                                    />
                                                ))}
                                            </div>
                                            <div className="history-card__progress">

                                                <div className="history-card__progress-top">

                                                    <div className="history-card__progress-info">

                                                        📖
                                                        <span>เส้นทางที่ผ่านแล้ว</span>

                                                        <span className="history-card__progress-current">
                                                            {book.routeFound}
                                                        </span>

                                                        <span>/ {book.totalRoutes}</span>

                                                    </div>

                                                    <span className="history-card__progress-percent">
                                                        {book.totalRoutes
                                                            ? Math.round(book.routeFound / book.totalRoutes * 100)
                                                            : 0}%
                                                    </span>

                                                </div>

                                                <div className="history-card__progress-bar">

                                                    <div
                                                        className="history-card__progress-fill"
                                                        style={{
                                                            width: `${book.totalRoutes
                                                                    ? (book.routeFound / book.totalRoutes) * 100
                                                                    : 0
                                                                }%`
                                                        }}
                                                    />

                                                </div>

                                            </div>


                                            <span
                                                className={`history-card__status history-card__status--${book.reading_status}`}
                                            >
                                                {statusLabels[book.reading_status]}
                                            </span>
                                        </div>
                                    </article>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default HistoryPage;