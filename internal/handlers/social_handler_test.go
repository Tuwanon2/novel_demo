package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"novel-be/internal/dto"
	"novel-be/internal/middleware"
	"novel-be/internal/models"
)

type stubSocialService struct {
	following []models.Writer
	err       error
}

func (s *stubSocialService) AddLike(models.Like) error                               { return nil }
func (s *stubSocialService) RemoveLike(userID, novelID int) error                    { return nil }
func (s *stubSocialService) IsLikeExists(userID, novelID int) (bool, error)          { return false, nil }
func (s *stubSocialService) AddToBookshelf(userID, novelID int) error                { return nil }
func (s *stubSocialService) RemoveFromBookshelf(userID, novelID int) error           { return nil }
func (s *stubSocialService) GetBookshelfByUserID(userID int) ([]models.Novel, error) { return nil, nil }
func (s *stubSocialService) GetBookshelfCountByNovelID(novelID int) (int, error)     { return 0, nil }
func (s *stubSocialService) GetBookshelfCountsByAuthorID(authorID int) ([]models.Novel, error) {
	return nil, nil
}
func (s *stubSocialService) AddComment(models.Comment) (int, error)    { return 0, nil }
func (s *stubSocialService) RemoveComment(commentID, userID int) error { return nil }
func (s *stubSocialService) AddFollow(models.Follow) error             { return nil }
func (s *stubSocialService) RemoveFollow(userID, writerID int) error   { return nil }
func (s *stubSocialService) GetFollowingWriters(userID int) ([]models.Writer, error) {
	return s.following, s.err
}
func (s *stubSocialService) GetCommentsByNovelID(novelID int) ([]dto.CommentDetailDTO, error) {
	return nil, nil
}
func (s *stubSocialService) GetCommentsBySceneID(sceneID int) ([]dto.CommentDetailDTO, error) {
	return nil, nil
}

func TestGetFollowingWritersHandlerReturnsWriterList(t *testing.T) {
	service := &stubSocialService{following: []models.Writer{{WriterID: 7, PenName: "Alice"}}}
	handler := GetFollowingWritersHandler(service)

	req := httptest.NewRequest(http.MethodGet, "/api/users/following-writers", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uint(4)))
	rr := httptest.NewRecorder()

	handler(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var body map[string]any
	if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}

	data, ok := body["data"].([]any)
	if !ok {
		t.Fatalf("expected data array in response body, got %T", body["data"])
	}

	if len(data) != 1 {
		t.Fatalf("expected 1 writer in response, got %d", len(data))
	}

	writer, ok := data[0].(map[string]any)
	if !ok {
		t.Fatalf("expected writer object in response, got %T", data[0])
	}

	if writer["writer_id"] != float64(7) {
		t.Fatalf("expected writer_id 7, got %v", writer["writer_id"])
	}
}
