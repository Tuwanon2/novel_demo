import React, { useMemo, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import "./StoryTreePage.css";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const NODE_STATUS = {
  VISITED: "visited",
  CURRENT: "current",
  LOCKED: "locked",
  ENDING_UNLOCKED: "ending_unlocked",
  ENDING_LOCKED: "ending_locked",
};

const STATUS_STYLE = {
  [NODE_STATUS.VISITED]: { stroke: "#4CAF82", fill: "#F0FBF5", text: "#2E7A55" },
  [NODE_STATUS.CURRENT]: { stroke: "#E91E8C", fill: "#FFF0F5", text: "#E91E8C" },
  [NODE_STATUS.LOCKED]: { stroke: "#C8C3D4", fill: "#F9F9FB", text: "#9E9589" },
  [NODE_STATUS.ENDING_UNLOCKED]: { stroke: "#F7C940", fill: "#FFFDE7", text: "#8B6D00" },
  [NODE_STATUS.ENDING_LOCKED]: { stroke: "#C8C3D4", fill: "#F9F9FB", text: "#9E9589" },
};

const StoryNode = ({ data }) => {
  const currentStatus = data.computedStatus || NODE_STATUS.LOCKED;
  const style = STATUS_STYLE[currentStatus] || STATUS_STYLE[NODE_STATUS.LOCKED];

  const sceneType = data.type || "normal";
  const isLocked = currentStatus === NODE_STATUS.LOCKED || currentStatus === NODE_STATUS.ENDING_LOCKED;

  const stripHtml = (text) => {
    if (!text || typeof text !== "string") return "";
    return text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  };

  const getPrefix = () => {
    if (sceneType === "start") return "▶ ";
    if (isLocked) return "🔒 ";
    if (sceneType === "ending") return "🏆 ";
    return "📖 ";
  };

  const sceneTitle = stripHtml(data.title || data.scene_name || data.name || data.label || data.chapter_name || `ฉากที่ ${data.id}`);
  const sceneDescription = stripHtml(data.summary || data.description || data.short_content || data.content_summary || data.content || data.Content || data.content_html || data.html_content || "อ่านต่อเพื่อค้นหาความลับในฉากนี้...");

  const chapterLabel = data.chapter_title || data.ChapterTitle || data.chapterName || data.chapter_name;
  const chapterEpisode = data.chapter_episode || data.chapterEpisode || data.episode || data.chapter_order || data.chapterOrder;
  const sceneNumber = data.scene_number || data.sceneNumber || data.order || data.scene_order || data.id;

  const footerLabel = sceneType === "start"
    ? "จุดเริ่มต้น"
    : sceneType === "ending"
      ? "ฉากจบ"
      : chapterEpisode
        ? `ตอนที่ ${chapterEpisode}`
        : chapterLabel
          ? chapterLabel
          : `ฉากที่ ${sceneNumber}`;

  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none' }} />

      <div
        className={`story-node ${currentStatus === NODE_STATUS.CURRENT ? "story-node--current" : ""}`}
        style={{
          borderColor: style.stroke,
          background: style.fill,
          color: style.text,
          padding: "14px",
          width: "280px",
          minHeight: "120px",
          borderRadius: "10px",
          boxShadow: "0 5px 10px -2px rgba(0, 0, 0, 0.08)",
          borderWidth: "2px",
          borderStyle: "solid",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}
      >
        <div>
          <div className="story-node__label" style={{ fontWeight: "700", fontSize: "13px", marginBottom: "8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis" }}>
            {getPrefix()}
            {isLocked ? "เนื้อเรื่องยังไม่เปิดเผย" : sceneTitle}
          </div>

          <div className="story-node__desc" style={{ fontSize: "11px", color: isLocked ? "#a0aec0" : "#4a5568", lineHeight: "1.5", minHeight: "40px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {isLocked ? "ผ่านเงื่อนไขในฉากก่อนหน้าเพื่อปลดล็อกผังเส้นทางคลังสายนี้" : sceneDescription}
          </div>
        </div>

        <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
          <div className="story-node__chapter" style={{ fontSize: "11px", opacity: 0.75, wordBreak: "break-word", flex: 1 }}>
            {footerLabel}
          </div>
          <div style={{ fontSize: "10px", padding: "4px 8px", borderRadius: "999px", background: "rgba(233, 30, 99, 0.12)", color: "#c2185b", whiteSpace: "nowrap" }}>
            {sceneType === "start" ? "เริ่มต้น" : sceneType === "ending" ? "ฉากจบ" : `ฉากที่ ${sceneNumber}`}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none' }} />
    </>
  );
};

// 🔒 ย้ายออกมาไว้นอก Component ตามคำแนะนำใน Console เพื่อแก้ Warning สีเหลืองข้อแรกตัวบนสุดครับ
const nodeTypes = {
  storyNode: StoryNode,
};

const StoryTreePage = ({ novelId: propNovelId, userId = 0, onNavigate }) => {
  const { novelId: urlNovelId } = useParams();
  const activeNovelId = propNovelId || urlNovelId;

  const getCurrentUserId = () => {
    const userJson = localStorage.getItem("user");
    if (!userJson) return 0;
    try {
      const user = JSON.parse(userJson);
      return user?.id || user?.user_id || 0;
    } catch (err) {
      console.error("Failed to parse user from localStorage:", err);
      return 0;
    }
  };

  const effectiveUserId = getCurrentUserId() || userId;

  const [treeData, setTreeData] = useState(null);
  const [novelDetail, setNovelDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!activeNovelId || activeNovelId === "undefined") {
      setError("ไม่พบรหัสนิยายเพื่อโหลดผังเส้นทาง");
      setLoading(false);
      return;
    }

    const loadAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        try {
          const novelRes = await fetch(`${BASE_URL}/novels/${activeNovelId}`);
          if (novelRes.ok) {
            const novelJson = await novelRes.json();
            setNovelDetail(novelJson?.data?.novel || novelJson?.data || novelJson);
          }
        } catch (e) {
          console.warn("ดึงข้อมูลนิยายหลักไม่สำเร็จ:", e);
        }

        const query = effectiveUserId > 0 ? `?user_id=${effectiveUserId}` : "";
        const response = await fetch(`${BASE_URL}/novels/${activeNovelId}/story-tree${query}`);
        if (!response.ok) {
          throw new Error("ไม่สามารถเรียกดูแผนผังนิยายกิ่งไม้จากฐานข้อมูลได้");
        }

        const resData = await response.json();
        const actualTreeData = resData.data || resData;
        if (actualTreeData) {
          setTreeData(actualTreeData);
        } else {
          throw new Error("รูปแบบ JSON ของผังต้นไม้ที่ระบบส่งมาไม่ถูกต้อง");
        }
      } catch (err) {
        console.error("StoryTree Fetch Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [activeNovelId, userId]);

  const { computedNodes, computedEdges, autoStats } = useMemo(() => {
    if (!treeData || !treeData.nodes) return { computedNodes: [], computedEdges: [], autoStats: null };

    const rawNodes = treeData.nodes;
    const rawEdges = treeData.edges || [];

    const startNode = rawNodes.find(n => n.type === "start") || rawNodes[0];
    const startNodeIdStr = startNode ? String(startNode.id) : null;
    const hasBackendCurrent = rawNodes.some(n => n.is_current === true);

    const parentMap = {};
    rawEdges.forEach(e => {
      const from = String(e.from_id || e.from);
      const to = String(e.to_id || e.to);
      if (!parentMap[to]) parentMap[to] = [];
      parentMap[to].push(from);
    });

    const adjList = {};
    const inDegree = {};
    rawNodes.forEach(n => { adjList[n.id] = []; inDegree[n.id] = 0; });
    rawEdges.forEach(e => {
      const from = e.from_id || e.from; const to = e.to_id || e.to;
      if (adjList[from] && adjList[to] !== undefined) { adjList[from].push(to); inDegree[to]++; }
    });
    const levels = {}; const queue = [];
    rawNodes.forEach(n => { if (inDegree[n.id] === 0 || n.type === "start") { levels[n.id] = 0; queue.push(n.id); } });
    while (queue.length > 0) {
      const curr = queue.shift(); const currLevel = levels[curr] || 0;
      (adjList[curr] || []).forEach(child => { if (levels[child] === undefined) { levels[child] = currLevel + 1; queue.push(child); } });
    }
    const levelCounts = {};
    rawNodes.forEach(n => { const lv = levels[n.id] || 0; levelCounts[lv] = (levelCounts[lv] || 0) + 1; });
    const levelCurrentTracker = {};

    const activeNodeIds = new Set();
    rawNodes.forEach(n => {
      if (n.type === "start" || n.is_current || n.is_unlocked) {
        activeNodeIds.add(String(n.id));
      }
    });

    const mappedNodes = rawNodes.map((node) => {
      const nodeIdStr = String(node.id);
      const lv = levels[node.id] || 0;
      if (levelCurrentTracker[lv] === undefined) levelCurrentTracker[lv] = 0;

      const branchIndex = levelCurrentTracker[lv];
      levelCurrentTracker[lv]++;
      const xPosition = lv * 480;
      const totalInLevel = levelCounts[lv] || 1;
      const yPosition = (branchIndex - (totalInLevel - 1) / 2) * 320;

      let computedStatus = NODE_STATUS.LOCKED;
      const parents = parentMap[nodeIdStr] || [];
      const isAnyParentActive = parents.some(pId => activeNodeIds.has(pId));

      const isCurrentNode = node.is_current || (!hasBackendCurrent && nodeIdStr === startNodeIdStr);

      if (node.type === "start") {
        computedStatus = isCurrentNode ? NODE_STATUS.CURRENT : NODE_STATUS.VISITED;
      } else if (node.type === "ending") {
        computedStatus = node.is_unlocked ? NODE_STATUS.ENDING_UNLOCKED : NODE_STATUS.ENDING_LOCKED;
      } else {
        if (isCurrentNode) {
          computedStatus = NODE_STATUS.CURRENT;
        } else if (node.is_unlocked || isAnyParentActive) {
          computedStatus = NODE_STATUS.VISITED;
        } else {
          computedStatus = NODE_STATUS.LOCKED;
        }
      }

      return {
        id: nodeIdStr,
        type: "storyNode",
        position: { x: xPosition + 60, y: yPosition + 220 },
        data: { ...node, computedStatus },
      };
    });

    const mappedEdges = rawEdges.map((edge, idx) => {
      const fromId = String(edge.from_id || edge.from);
      const toId = String(edge.to_id || edge.to);
      const sourceNodeMapped = mappedNodes.find(n => n.id === fromId);

      const isSourceActive = sourceNodeMapped?.data?.computedStatus === NODE_STATUS.CURRENT ||
        sourceNodeMapped?.data?.computedStatus === NODE_STATUS.VISITED;

      return {
        id: String(edge.id || `e-${fromId}-${toId}-${idx}`),
        source: fromId,
        target: toId,
        animated: isSourceActive,
        label: edge.label || edge.choice_text || edge.text || "???",
        labelStyle: { fill: "#4a5568", fontWeight: 500, fontSize: 11 },
        labelBgPadding: [4, 4],
        labelBgRadius: 4,
        labelBgStyle: { fill: "#ffffff", fillOpacity: 1, stroke: "#cbd5e1", strokeWidth: 1 },
        labelBgBorderRadius: 4,
        style: { stroke: isSourceActive ? "#4CAF82" : "#D0CCD7", strokeWidth: 2 },
        type: "smoothstep",
      };
    });

    const visitedScenesCount = mappedNodes.filter(n => n.data.computedStatus === NODE_STATUS.VISITED || n.data.computedStatus === NODE_STATUS.CURRENT).length;

    const discoveredChoicesCount = mappedEdges.filter(edge => {
      const targetNode = mappedNodes.find(n => n.id === edge.target);
      return targetNode && (
        targetNode.data.computedStatus === NODE_STATUS.VISITED ||
        targetNode.data.computedStatus === NODE_STATUS.CURRENT ||
        targetNode.data.computedStatus === NODE_STATUS.ENDING_UNLOCKED
      );
    }).length;

    const unlockedEndingsCount = mappedNodes.filter(n => n.data.computedStatus === NODE_STATUS.ENDING_UNLOCKED).length;

    return {
      computedNodes: mappedNodes,
      computedEdges: mappedEdges,
      autoStats: {
        visitedScenes: visitedScenesCount,
        totalScenes: rawNodes.length,
        discoveredChoices: discoveredChoicesCount,
        totalChoices: rawEdges.length,
        unlockedEndings: unlockedEndingsCount,
        totalEndings: rawNodes.filter(n => n.type === "ending").length || 3
      }
    };
  }, [treeData]);

  const handleNodeClick = (_, node) => {
    const currentStatus = node.data?.computedStatus;
    const clickable = currentStatus === NODE_STATUS.CURRENT ||
      currentStatus === NODE_STATUS.VISITED ||
      currentStatus === NODE_STATUS.ENDING_UNLOCKED;

    if (!clickable) return;

    if (onNavigate) {
      onNavigate("reading", {
        novelId: activeNovelId,
        initialSceneId: node.data.id,
      });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "100px", textAlign: "center", color: "#666" }}>
        <div style={{ width: "40px", height: "40px", border: "4px solid #f3f3f3", borderTop: "4px solid #E91E8C", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
        <p style={{ fontSize: "1.1rem" }}>กำลังเตรียมข้อมูลผังเส้นทาง...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "#f44336" }}>
        <h3>💥 โหลดผังโครงสร้างไม่สำเร็จ</h3>
        <p>{error}</p>
      </div>
    );
  }

  const finalTitle = novelDetail?.title || treeData?.novel_title || "ผังโครงสร้างเนื้อเรื่อง";
  const stats = autoStats || {
    visitedScenes: 0,
    totalScenes: 0,
    discoveredChoices: 0,
    totalChoices: 0,
    unlockedEndings: 0,
    totalEndings: 0
  };

  return (
    <div className="stp">
      <div className="stp__container">
        <button className="stp__back" onClick={() => onNavigate && onNavigate("novel-detail", { novelId: activeNovelId })}>
          ← กลับรายละเอียด
        </button>

        <div className="stp__header">
          <h1 className="stp__title">
            ผังเส้นทาง
            <span className="stp__title-sep">{" "}—{" "}</span>
            <span className="stp__title-novel" style={{ color: "#E91E8C" }}>{finalTitle}</span>
          </h1>

          <div className="stp__legend">
            {[
              { color: "#E91E8C", label: "จุดปัจจุบัน" },
              { color: "#4CAF82", label: "ปลดล็อกแล้ว" },
              { color: "#F7C940", label: "ตอนจบปลดแล้ว" },
              { color: "#C8C3D4", label: "ยังไม่ปลดล็อก" },
            ].map((item) => (
              <div key={item.label} className="stp__legend-item">
                <span className="stp__legend-dot" style={{ background: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="stp__main">
          {/* กำหนดขนาดกว้างสูงแบบ inline และครอบเงื่อนไขให้แน่ใจว่าเรนเดอร์ React Flow ตอนมีข้อมูลชัวร์ๆ ป้องกัน Warning ตัวที่สองครับ */}
          <div className="stp__flow-wrapper" style={{ width: "100%", height: "650px", background: "#f8f9fa", borderRadius: "8px", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {computedNodes.length > 0 ? (
              <ReactFlow
                nodes={computedNodes}
                edges={computedEdges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                zoomOnScroll={true}
                panOnDrag={true}
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={false}
                onNodeClick={handleNodeClick}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={24} size={1} color="#e2e8f0" />
                <Controls />
                <MiniMap
                  nodeColor={(node) => {
                    const status = node.data?.computedStatus;
                    if (status === NODE_STATUS.CURRENT) return "#E91E8C";
                    if (status === NODE_STATUS.VISITED) return "#4CAF82";
                    if (status === NODE_STATUS.ENDING_UNLOCKED) return "#F7C940";
                    return "#cbd5e1";
                  }}
                  maskColor="rgba(248, 249, 250, 0.7)"
                  style={{ borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </ReactFlow>
            ) : (
              <div style={{ textAlign: "center", color: "#718096", padding: "20px" }}>
                <span style={{ fontSize: "40px" }}>🍁</span>
                <p style={{ marginTop: "12px", fontSize: "15px", fontWeight: "500" }}>นิยายเรื่องนี้ยังไม่มีการเพิ่มตอนหรือฉากเนื้อเรื่อง</p>
                <p style={{ fontSize: "13px", opacity: 0.8 }}>โปรดติดตามชมแผนผังเส้นทางอีกครั้งเมื่อนักเขียนเริ่มลงเนื้อหา</p>
              </div>
            )}
          </div>

          <aside className="stp__sidebar">
            <div className="stp__stat-card">
              <div className="stp__stat-card-title">สถิติการสำรวจ</div>

              {[
                { label: "เส้นทางที่ผ่านแล้ว", val: stats.visitedScenes, total: stats.totalScenes },
                { label: "ทางเลือกที่ค้นพบ", val: stats.discoveredChoices, total: stats.totalChoices },
                { label: "ตอนจบที่ปลดล็อก", val: stats.unlockedEndings, total: stats.totalEndings },
              ].map((stat, i) => (
                <div key={i} style={{ marginTop: i > 0 ? 14 : 0 }}>
                  <div className="stp__stat-item">
                    <span className="stp__stat-label">{stat.label}</span>
                    <span className="stp__stat-value stp__stat-value--pink">
                      {stat.val}/{stat.total}
                    </span>
                  </div>
                  <div className="stp__stat-track">
                    <div
                      className="stp__stat-fill stp__stat-fill--pink"
                      style={{ width: `${stat.total > 0 ? (stat.val / stat.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default StoryTreePage;
