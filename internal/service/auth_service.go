package service

import (
	"context"
	"errors"
	"time"

	"novel-be/internal/dto"
	"novel-be/internal/models"
	"novel-be/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	repo repository.AuthRepository
}

func NewAuthService(repo repository.AuthRepository) *AuthService {
	return &AuthService{repo: repo}
}

// Register จัดการการแฮชรหัสผ่านและสั่งบันทึกข้อมูลจริงลงฐานข้อมูล
func (s *AuthService) Register(ctx context.Context, req dto.RegisterRequest, avatarURL string) (*models.User, error) {
	// 1. เข้ารหัสลับ Password ด้วย Bcrypt ป้องกันการเห็นรหัสจริงใน DB
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// 2. ขึ้นโครงข้อมูลเพื่อเตรียมนำไปโยนลงฐานข้อมูล
	user := &models.User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		PicProfile:   avatarURL,
		Role:         "reader", // สมัครสมาชิกครั้งแรกให้สิทธิ์เป็นผู้อ่านเริ่มต้น
	}

	// 3. สั่งบันทึกผ่านชั้น Repository ไปยัง PostgreSQL
	if err := s.repo.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

// Login ตรวจสอบความถูกต้องของ Email / Password และออกบัตรผ่าน JWT Token
func (s *AuthService) Login(ctx context.Context, req dto.LoginRequest) (*dto.AuthResponse, error) {
	if req.Email == "" {
		return nil, errors.New("กรุณากรอกอีเมลและรหัสผ่าน")
	}

	// 1. ตรวจสอบว่ามียูสเซอร์นี้อยู่ในฐานข้อมูลหรือไม่
	user, err := s.repo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("ไม่พบบัญชีผู้ใช้งานนี้ในระบบ")
	}

	// 2. แกะรหัสตรวจสอบว่าตรงกับที่เคยสมัครไว้ไหม
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		return nil, errors.New("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง")
	}

	// 3. สร้างตั๋ว JWT Token (มีอายุการใช้งาน 24 ชั่วโมง)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"role":    user.Role,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	})

	// 4. เซ็นรหัสตั๋วด้วย Secret Key ประจำระบบหลังบ้าน
	tokenString, err := token.SignedString([]byte("my-super-secret-novel-key"))
	if err != nil {
		return nil, err
	}

	// 5. ประกอบร่างผลลัพธ์ส่งกลับไปให้หน้าบ้านจัดเก็บ
	res := &dto.AuthResponse{
		Token: tokenString,
	}
	res.User.ID = user.ID
	res.User.Username = user.Username
	res.User.Email = user.Email
	res.User.PicProfile = user.PicProfile
	res.User.Role = user.Role

	return res, nil
}

// GetUserByID ดึงข้อมูลผู้ใช้โดยใช้ ID ของเขา (สำหรับ /api/users endpoint)
func (s *AuthService) GetUserByID(ctx context.Context, userID uint) (*models.User, error) {
	if userID == 0 {
		return nil, errors.New("ไอดีผู้ใช้ไม่ถูกต้อง")
	}

	user, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("ไม่พบบัญชีผู้ใช้นี้")
	}

	return user, nil
}
