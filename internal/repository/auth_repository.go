package repository

import (
	"context"
	"database/sql"
	"novel-be/internal/models"
)

type sqlAuthRepository struct {
	db *sql.DB
}

func NewAuthRepository(db *sql.DB) AuthRepository {
	return &sqlAuthRepository{db: db}
}

// CreateUser ยิง SQL บันทึกยูสเซอร์ใหม่ลงฐานข้อมูลจริง
func (r *sqlAuthRepository) CreateUser(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (username, email, password_hash, role, pic_profile, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		RETURNING user_id, created_at, updated_at
	`
	err := r.db.QueryRowContext(ctx, query, user.Username, user.Email, user.PasswordHash, user.Role, user.PicProfile).
		Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	return err
}

// GetByUsername ดึงข้อมูลจากฐานข้อมูลมาตรวจสอบตอนล็อกอิน
func (r *sqlAuthRepository) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	query := `SELECT user_id, username, email, password_hash, pic_profile, role FROM users WHERE username = $1`

	var user models.User
	err := r.db.QueryRowContext(ctx, query, username).
		Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.PicProfile, &user.Role)

	if err == sql.ErrNoRows {
		return nil, nil // หาไม่พบยูสเซอร์
	}
	if err != nil {
		return nil, err // เกิดข้อผิดพลาดอื่น ๆ จาก Database
	}
	return &user, nil
}

func (r *sqlAuthRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `SELECT user_id, username, email, password_hash, pic_profile, role FROM users WHERE email = $1`

	var user models.User
	err := r.db.QueryRowContext(ctx, query, email).
		Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.PicProfile, &user.Role)

	if err == sql.ErrNoRows {
		return nil, nil // หาไม่พบยูสเซอร์
	}
	if err != nil {
		return nil, err // เกิดข้อผิดพลาดอื่น ๆ จาก Database
	}
	return &user, nil
}

// GetByID ดึงข้อมูลผู้ใช้จากไอดีของเขา (ใช้ตอนต้องการเรียกดูข้อมูลผู้ใช้ปัจจุบัน)
func (r *sqlAuthRepository) GetByID(ctx context.Context, userID uint) (*models.User, error) {
	query := `SELECT user_id, username, email, password_hash, pic_profile, role FROM users WHERE user_id = $1`

	var user models.User
	err := r.db.QueryRowContext(ctx, query, userID).
		Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.PicProfile, &user.Role)

	if err == sql.ErrNoRows {
		return nil, nil // หาไม่พบยูสเซอร์
	}
	if err != nil {
		return nil, err // เกิดข้อผิดพลาดอื่น ๆ จาก Database
	}
	return &user, nil
}
