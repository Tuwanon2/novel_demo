import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import GenreTag from "../../../components/GenreTag/GenreTag";
import "./BookshelfPage.css";

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

const BookshelfPage = () => {
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

        const loadBookshelf = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const userId = getCurrentUserId();
                const headers = { "Content-Type": "application/json" };
                if (token) headers.Authorization = `Bearer ${token}`;

                const bookshelfUrl = `${API_BASE_URL}/bookshelf${userId ? `?user_id=${userId}` : ""}`;
                const shelfRes = await axios.get(bookshelfUrl, { headers });
                const shelfPayload =
                    shelfRes.data?.data?.bookshelf ||
                    shelfRes.data?.bookshelf ||
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
                    setBooks(BOOKSHELF_MOCK_DATA.map(normalizeBook));
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        loadBookshelf();
        return () => {
            active = false;
        };
    }, []);

    const filteredBooks = useMemo(() => {
        if (filter === "all") return books;
        return books.filter((book) => book.reading_status === filter);
    }, [books, filter]);

    return (
        <div className="bookshelf-page">
            <div className="bookshelf-page__container">
                <header className="bookshelf-page__header">
                    <div>
                        <p className="bookshelf-page__eyebrow">ชั้นหนังสือของฉัน</p>
                        <h1 className="bookshelf-page__title">นิยายที่บันทึกไว้</h1>
                    </div>

                    <div className="bookshelf-page__filter">
                        <label htmlFor="bookshelf-filter">กรองสถานะ</label>
                        <select
                            id="bookshelf-filter"
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
                    <div className="bookshelf-page__loading">กำลังโหลดชั้นหนังสือ...</div>
                ) : (
                    <>
                        <div className="bookshelf-page__summary">
                            <span>{filteredBooks.length} เรื่อง</span>
                            {filter !== "all" && (
                                <span className="bookshelf-page__summary-tag">
                                    {statusLabels[filter]}
                                </span>
                            )}
                        </div>

                        <div className="bookshelf-page__grid">
                            {filteredBooks.length === 0 ? (
                                <div className="bookshelf-page__empty">
                                    ไม่มีนิยายในสถานะนี้ ขยับไปลองสถานะอื่นได้
                                </div>
                            ) : (
                                filteredBooks.map((book) => (
                                    <article
                                        key={book.id}
                                        className="bookshelf-card"
                                        onClick={() => navigate(`/novel/${book.id}`)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") navigate(`/novel/${book.id}`);
                                        }}
                                        tabIndex={0}
                                        role="button"
                                    >
                                        <div className="bookshelf-card__cover">
                                            <img src={book.coverImage} alt={`${book.title} ปกนิยาย`} />
                                        </div>
                                        <div className="bookshelf-card__body">
                                            <div className="bookshelf-card__tags">
                                                {book.categories.slice(0, 2).map((category) => (
                                                    <GenreTag
                                                        key={`${book.id}-${category}`}
                                                        label={category}
                                                        variant="primary"
                                                    />
                                                ))}
                                            </div>

                                            <h2 className="bookshelf-card__title">{book.title}</h2>
                                            <p className="bookshelf-card__author">{book.author}</p>
                                            <p className="bookshelf-card__description">
                                                {book.synopsis}
                                            </p>
                                            <div className="bookshelf-card__progress">
                                                <div className="bookshelf-card__progress-text">
                                                    สำรวจแล้ว {book.routeFound}/{book.totalRoutes} เส้นทาง
                                                </div>

                                                <div className="bookshelf-card__progress-bar">
                                                    <div
                                                        className="bookshelf-card__progress-fill"
                                                        style={{
                                                            width: `${book.totalRoutes
                                                                ? (book.routeFound / book.totalRoutes) * 100
                                                                : 0
                                                                }%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>


                                            <span className={`bookshelf-card__status bookshelf-card__status--${book.reading_status}`}>
                                                {statusLabels[book.reading_status] || "ไม่ระบุสถานะ"}
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

export default BookshelfPage;