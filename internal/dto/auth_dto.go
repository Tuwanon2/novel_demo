package dto

import "mime/multipart"

// RegisterRequest รับข้อมูลจากฟอร์มสมัครสมาชิกแบบฟอร์ม (Form-Data)
type RegisterRequest struct {
	Username string                `form:"username"`
	Email    string                `form:"email"`
	Password string                `form:"password"`
	Avatar   *multipart.FileHeader `form:"avatar"` // รองรับการอัปโหลดไฟล์รูปเข้า MinIO
}

// LoginRequest รับข้อมูล JSON ตอนเข้าสู่ระบบ
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// AuthResponse ผลลัพธ์ส่งกลับไปหน้าบ้านพร้อมตั๋ว JWT
type AuthResponse struct {
	Token string `json:"token"`
	User  struct {
		ID         uint   `json:"id"`
		Username   string `json:"username"`
		Email      string `json:"email"`
		PicProfile string `json:"pic_profile"`
		Role       string `json:"role"`
	} `json:"user"`
}
