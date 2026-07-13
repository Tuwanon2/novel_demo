import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FollowButton from "../FollowButton/FollowButton";
import "./WriterCard.css";

const STATUS_CFG = {
  ongoing:  { label: "กำลังเขียน", color: "#059669", bg: "#ECFDF5" },
  finished: { label: "จบแล้ว",    color: "#6B7280", bg: "#F3F4F6" },
};

function Avatar({ writer, size = 52 }) {
  return (
    <div 
      className="avatar"
      style={{
        width: size, 
        height: size, 
        borderRadius: "50%",
        flexShrink: 0,
        background: `linear-gradient(135deg, ${writer.color}, ${writer.color}88)`,
        fontSize: size * 0.4, 
        boxShadow: `0 2px 10px ${writer.color}40`,
      }}
    >
      {writer.name.charAt(0)}
    </div>
  );
}

export default function WriterCard({ writer, onUnfollow, isFollowing = true }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [isFollowed, setIsFollowed] = useState(isFollowing);

  const handleOpenNovel = (novelId) => {
    if (!novelId) return;
    navigate(`/novel/${novelId}`);
  };

  return (
    <div className="card">
      <div className="cardTop">
        <div className="metaRow">
          <div className="avatarWrapper">
            <Avatar writer={writer} size={52} />
          </div>

          <div className="infoCol">
            <div className="infoHead">
              <div>
                <div className="writerNameWrapper">
                  <span className="writerName">{writer.name}</span>
                  {/* เงื่อนไขการขึ้น Badge อัปเดตใหม่ */}
                  {writer.hasUnreadUpdate && (
                    <span className="badgeUnread">● อัปเดตใหม่</span>
                  )}
                </div>
                {writer.bio && <div className="writerBio">{writer.bio}</div>}
              </div>
            </div>

            <div className="countRow">
              <div className="countItem">
                <span>👥</span>
                <span>
                  <strong>{writer.followers.toLocaleString()}</strong> ผู้ติดตาม
                </span>
              </div>
              <div className="countItem">
                <span>📚</span>
                <span>
                  <strong>{writer.novelCount?.toLocaleString?.() ?? writer.novels.length}</strong> เรื่อง
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ส่วนอัปเดตล่าสุด: ปรับเป็น 2 บรรทัดย่อยอ่านง่ายขึ้น */}
        {writer.latestUpdate && (
          <div className="updatePill">
            <div className="updateMain">
              <div className="updateTag">🔔 อัปเดตล่าสุด</div>
              <div className="updateTitle">{writer.latestUpdate.title}</div>
              <div className="updateDetailBlock">
                <div>{writer.latestUpdate.detail}</div>
                <div className="updateTimeLine">{writer.latestUpdate.time}</div>
              </div>
            </div>
          </div>
        )}

        {/* ขยายรายการนิยาย: เพิ่มรูปปก ชื่อ สถานะ ลูกศร (ลบจำนวน Ending ออกแล้ว) */}
        <div className="accordionWrapper">
          <button
            onClick={() => setExpanded(p => !p)}
            className="accordionToggle"
          >
            <span className="accordionLabel">
              📖 นิยายทั้งหมด ({writer.novelCount?.toLocaleString?.() ?? writer.novels.length} เรื่อง)
            </span>
            <span className={`accordionArrow ${expanded ? "accordionArrowExpanded" : ""}`}>
              ▼
            </span>
          </button>

          {expanded && (
            <div className="novelList">
              {writer.novels.map(n => {
                const s = STATUS_CFG[n.status] || STATUS_CFG.ongoing;
                return (
                  <div
                    key={n.id}
                    className="novelCard"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenNovel(n.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleOpenNovel(n.id);
                      }
                    }}
                  >
                    {n.cover ? (
                      <img
                        src={n.cover}
                        alt={n.title}
                        className="novelCover"
                      />
                    ) : (
                      <div className="novelCover novelCoverPlaceholder">
                        📘
                      </div>
                    )}
                    <div className="novelInfo">
                      <div className="novelTitle">{n.title}</div>
                    </div>
                    <div className="statusWrapper">
                      <span 
                        className="statusBadge"
                        style={{ color: s.color, background: s.bg }}
                      >
                        {s.label}
                      </span>
                      <span className="chevronRight">›</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* โซนปุ่มกด: ดูผลงาน + ติดตาม/เลิกติดตาม */}
      <div className="cardActions">
        <button
          type="button"
          className="btnWorks"
          onClick={() => handleOpenNovel(writer.novels?.[0]?.id)}
          disabled={!writer.novels?.length}
        >
          ดูผลงาน →
        </button>

        {/* ปุ่มติดตาม/เลิกติดตาม ใช้ FollowButton Component */}
        <FollowButton
          writerId={writer.id}
          writerName={writer.name}
          isFollowing={isFollowed}
          onFollowChange={(newFollowStatus) => {
            setIsFollowed(newFollowStatus);
            if (!newFollowStatus && onUnfollow) {
              onUnfollow(writer.id);
            }
          }}
          size="medium"
        />
      </div>
    </div>
  );
}