package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"novel-be/internal/dto"
	"novel-be/internal/models"
	"novel-be/internal/repository"
)

type writerService struct {
	repo repository.WriterRepository
}

// NewWriterServiceDirect ส่งมอบบริการและสวมรอยอินเตอร์เฟซหลัก
func NewWriterServiceDirect(repo repository.WriterRepository) *writerService {
	return &writerService{repo: repo}
}

// 🟢 2. ปรับปรุงฟังก์ชันนี้ให้ตรงตามสัญญา (want GetWriterByID(int) (*models.Writer, error))
func (s *writerService) GetWriterByID(id int) (*models.Writer, error) {
	// วิ่งไปเรียกฝั่ง repo ต่อเพื่อดึงข้อมูลนักเขียนและส่งคืนไทป์โมเดลตรง ๆ
	return s.repo.GetWriterByID(id)
}

func (s *writerService) GetWriterByUserID(userID int) (*models.Writer, error) {
	return s.repo.GetWriterByUserID(userID)
}

// ✍️ 3. Logic ส่งคำขอสมัครเป็นนักเขียน
func (s *writerService) ApplyForWriter(ctx context.Context, userID uint, req dto.WriterApplyRequest) error {
	if req.PenName == "" || req.ContactRequired == "" {
		return errors.New("กรุณากรอกข้อมูลนามปากกาและช่องทางติดต่อหลักที่จำเป็นค่ะ")
	}

	// ป้องกันการสมัครซ้ำสำหรับผู้ใช้ที่มีบันทึกในตาราง writers แล้ว
	existingWriter, err := s.repo.GetWriterByUserID(int(userID))
	if err != nil && err != sql.ErrNoRows {
		return err
	}
	if existingWriter != nil {
		return errors.New("คุณได้สมัครหรือเป็นนักเขียนอยู่แล้ว หากต้องการให้แอดมินตรวจสอบ กรุณาติดต่อเจ้าหน้าที่")
	}

	// มัดรวมข้อมูลการติดต่อและประเภทนิยายทั้งหมดลงใน JSON เดียว
	contacts := map[string]interface{}{
		"primary_contact":   req.ContactRequired,
		"secondary_contact": req.ContactOptional,
		"genres":            req.Genres,
	}

	contactBytes, err := json.Marshal(contacts)
	if err != nil {
		return err
	}

	return s.repo.Apply(ctx, userID, req, string(contactBytes))
}

// 🔍 4. Logic ดึงรายการคำขอที่รอการตรวจสอบ (pending)
func (s *writerService) GetPendingRequests(ctx context.Context) ([]dto.WriterRequestResponse, error) {
	return s.repo.GetPendingRequests(ctx)
}

// ✅ 5. Logic การกดอนุมัติอัปเกรดฐานะผู้ใช้งาน
func (s *writerService) ApproveWriter(ctx context.Context, writerID uint) error {
	if writerID == 0 {
		return errors.New("รหัสคำขอนักเขียนไม่ถูกต้อง")
	}
	return s.repo.ApproveWriter(ctx, writerID)
}

// ❌ Logic การกดปฏิเสธคำขอสมัครนักเขียน
func (s *writerService) RejectWriter(ctx context.Context, writerID uint) error {
	if writerID == 0 {
		return errors.New("รหัสคำขอนักเขียนไม่ถูกต้อง")
	}
	return s.repo.RejectWriter(ctx, writerID)
}
