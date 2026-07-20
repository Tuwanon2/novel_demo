package repository

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"
)

type SupabaseMediaRepository struct {
	baseURL          string
	anonKey          string
	serviceRoleKey   string
	bucketName       string
	publicBaseURL    string
}

func NewSupabaseMediaRepository(baseURL, anonKey, serviceRoleKey, bucketName string) MediaRepository {
	baseURL = strings.TrimRight(baseURL, "/")
	if baseURL == "" {
		baseURL = "https://your-project.supabase.co"
	}
	return &SupabaseMediaRepository{
		baseURL:        baseURL,
		anonKey:        anonKey,
		serviceRoleKey: serviceRoleKey,
		bucketName:     bucketName,
		publicBaseURL:  baseURL,
	}
}

func (s *SupabaseMediaRepository) EnsureBucketExists(ctx context.Context, bucketName string) error {
	if bucketName == "" {
		bucketName = s.bucketName
	}

	storageURL := fmt.Sprintf("%s/storage/v1/bucket/%s", s.baseURL, url.PathEscape(bucketName))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, storageURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create bucket check request: %w", err)
	}

	authorization := s.serviceRoleKey
	if authorization == "" {
		authorization = s.anonKey
	}
	if authorization != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", authorization))
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to check Supabase bucket: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusNoContent {
		return nil
	}
	if resp.StatusCode != http.StatusNotFound {
		return fmt.Errorf("supabase bucket check failed: %s", resp.Status)
	}

	createReq, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("%s/storage/v1/bucket", s.baseURL), strings.NewReader(fmt.Sprintf(`{"name":"%s","public":true}`, bucketName)))
	if err != nil {
		return fmt.Errorf("failed to create bucket request: %w", err)
	}
	if authorization != "" {
		createReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", authorization))
	}
	createReq.Header.Set("Content-Type", "application/json")

	createResp, err := http.DefaultClient.Do(createReq)
	if err != nil {
		return fmt.Errorf("failed to create Supabase bucket: %w", err)
	}
	defer createResp.Body.Close()

	if createResp.StatusCode >= 400 {
		body, _ := io.ReadAll(io.LimitReader(createResp.Body, 4096))
		return fmt.Errorf("supabase bucket create failed: %s %s", createResp.Status, strings.TrimSpace(string(body)))
	}

	return nil
}

func (s *SupabaseMediaRepository) UploadFile(ctx context.Context, bucketName, objectName string, reader io.Reader, objectSize int64, contentType string) (string, error) {
	if bucketName == "" {
		bucketName = s.bucketName
	}
	if objectName == "" {
		return "", fmt.Errorf("object name is required")
	}

	payload, err := io.ReadAll(reader)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	storageURL := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.baseURL, url.PathEscape(bucketName), url.PathEscape(objectName))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, storageURL, bytes.NewReader(payload))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	authorization := s.serviceRoleKey
	if authorization == "" {
		authorization = s.anonKey
	}
	if authorization != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", authorization))
	}
	req.Header.Set("Content-Type", contentType)
	if objectSize > 0 {
		req.ContentLength = objectSize
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to upload to Supabase storage: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return "", fmt.Errorf("supabase upload failed: %s %s", resp.Status, strings.TrimSpace(string(body)))
	}

	return s.buildPublicURL(objectName), nil
}

func (s *SupabaseMediaRepository) DownloadFile(ctx context.Context, bucketName, objectName string) (io.Reader, error) {
	if bucketName == "" {
		bucketName = s.bucketName
	}
	storageURL := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.baseURL, url.PathEscape(bucketName), url.PathEscape(objectName))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, storageURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.serviceRoleKey))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to download from Supabase storage: %w", err)
	}
	if resp.StatusCode >= 400 {
		defer resp.Body.Close()
		return nil, fmt.Errorf("supabase download failed: %s", resp.Status)
	}
	return resp.Body, nil
}

func (s *SupabaseMediaRepository) DeleteFile(ctx context.Context, bucketName, objectName string) error {
	if bucketName == "" {
		bucketName = s.bucketName
	}
	storageURL := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.baseURL, url.PathEscape(bucketName), url.PathEscape(objectName))
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, storageURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.serviceRoleKey))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to delete from Supabase storage: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("supabase delete failed: %s", resp.Status)
	}
	return nil
}

func (s *SupabaseMediaRepository) GetPresignedURL(ctx context.Context, bucketName, objectName string) (string, error) {
	if bucketName == "" {
		bucketName = s.bucketName
	}

	resource := map[string]string{"bucketName": bucketName, "objectName": objectName}
	body, err := json.Marshal(resource)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	storageURL := fmt.Sprintf("%s/storage/v1/object/sign/%s", s.baseURL, url.PathEscape(objectName))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, storageURL, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.serviceRoleKey))
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to sign URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("supabase presign failed: %s", resp.Status)
	}

	var result struct {
		SignedURL string `json:"signedURL"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to parse signed URL: %w", err)
	}
	return result.SignedURL, nil
}

func (s *SupabaseMediaRepository) buildPublicURL(objectName string) string {
	encodedObjectName := strings.ReplaceAll(path.Clean("/"+objectName), "//", "/")
	return fmt.Sprintf("%s/storage/v1/object/public/%s/%s", s.baseURL, url.PathEscape(s.bucketName), strings.TrimPrefix(encodedObjectName, "/"))
}
