package service

import (
	"context"
	"fmt"
	"mime/multipart"
	"novel-be/internal/repository"
	"path/filepath"
	"strings"
	"time"
)

const (
	NovelImagesBucket = "novel-buckets"
	MaxFileSize       = 10 * 1024 * 1024
)

type mediaService struct {
	mediaRepo repository.MediaRepository
}

func NewMediaService(mediaRepo repository.MediaRepository) MediaService {
	return &mediaService{
		mediaRepo: mediaRepo,
	}
}

func (s *mediaService) UploadImage(ctx context.Context, file *multipart.FileHeader) (string, error) {
	if file.Size > MaxFileSize {
		return "", fmt.Errorf("file size exceeds 10MB")
	}

	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	ext := strings.ToLower(filepath.Ext(file.Filename))
	contentType := strings.ToLower(strings.TrimSpace(file.Header.Get("Content-Type")))
	if !isAllowedImageType(ext, contentType) {
		return "", fmt.Errorf("invalid file type")
	}

	if ext == "" && contentType != "" {
		ext = "." + strings.TrimPrefix(contentType, "image/")
		if ext == "." {
			ext = ".bin"
		}
	}
	if ext == "" {
		ext = ".jpg"
	}
	cleanFilename := strings.ReplaceAll(file.Filename, " ", "_")
	if cleanFilename == "" {
		cleanFilename = fmt.Sprintf("upload-%d%s", time.Now().Unix(), ext)
	} else if !strings.HasSuffix(cleanFilename, ext) {
		cleanFilename = strings.TrimSuffix(cleanFilename, filepath.Ext(cleanFilename)) + ext
	}

	objectName := fmt.Sprintf("uploads/%d-%s", time.Now().Unix(), cleanFilename)

	if err := s.mediaRepo.EnsureBucketExists(ctx, NovelImagesBucket); err != nil {
		return "", err
	}

	// 🟢 รับ URL เต็ม (http://minio:9000/...) มาส่งต่อ
	url, err := s.mediaRepo.UploadFile(ctx, NovelImagesBucket, objectName, src, file.Size, contentType)
	if err != nil {
		return "", err
	}

	return url, nil
}

func (s *mediaService) DeleteImage(ctx context.Context, filename string) error {
	return s.mediaRepo.DeleteFile(ctx, NovelImagesBucket, filename)
}

func (s *mediaService) GetPresignedURL(ctx context.Context, filename string) (string, error) {
	return s.mediaRepo.GetPresignedURL(ctx, NovelImagesBucket, filename)
}

func isAllowedImageType(ext string, contentType string) bool {
	ext = strings.ToLower(strings.TrimSpace(ext))
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	allowedExt := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	allowedMime := map[string]bool{"image/jpeg": true, "image/png": true, "image/gif": true, "image/webp": true}
	if allowedExt[ext] {
		return true
	}
	if contentType != "" && allowedMime[contentType] {
		return true
	}
	return false
}
