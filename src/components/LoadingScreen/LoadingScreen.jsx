import React from "react";

const LoadingScreen = () => {
    return (
        <div style={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            height: "100vh", // เต็มจอ
            backgroundColor: "#f8fafc",
            flexDirection: "column",
            gap: "1rem"
        }}>
            {/* คุณสามารถเปลี่ยนเป็นรูป GIF ลายเส้นหมุนๆ หรือ CSS Spinner ได้ตามใจชอบ */}
            <div className="spinner" style={{
                width: "50px", height: "50px", 
                border: "5px solid #e2e8f0",
                borderTop: "5px solid #e11d48", 
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
            }} />
            <h3 style={{ color: "#475569" }}>กำลังโหลดข้อมูล... ⏳</h3>

            <style>
                {`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                `}
            </style>
        </div>
    );
};

export default LoadingScreen;