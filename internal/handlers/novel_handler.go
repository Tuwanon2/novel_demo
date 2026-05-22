package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"novel-be/internal/middleware"
	"novel-be/internal/models"
	"novel-be/internal/service"
)

func NovelsHandler(novelService service.NovelService, writerService service.WriterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			novels, err := novelService.ListNovels()
			if err != nil {
				WriteError(w, http.StatusInternalServerError, err.Error())
				return
			}
			WriteJSON(w, http.StatusOK, novels)
		case http.MethodPost:
			userID, ok := middleware.GetUserIDFromContext(r.Context())
			if !ok || userID == 0 {
				WriteError(w, http.StatusUnauthorized, "unauthorized: ไม่พบข้อมูลสิทธิ์ผู้ใช้งานหรือโทเคนไม่ถูกต้อง")
				return
			}

			writer, err := writerService.GetWriterByUserID(int(userID))
			if err != nil || writer == nil {
				WriteError(w, http.StatusForbidden, "forbidden: คุณยังไม่ใช่นักเขียนที่ได้รับอนุมัติ")
				return
			}

			var req CreateNovelRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				WriteError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			if err := req.Validate(); err != nil {
				WriteError(w, http.StatusBadRequest, err.Error())
				return
			}

			novelID, err := novelService.CreateNovel(models.Novel{
				Title:        req.Title,
				Captions:     req.Captions,
				Introduction: req.Introduction,
				CoverImage:   req.CoverImage,
				Status:       req.Status,
				CategoryIDs:  req.CategoryIDs,
				AuthorID:     writer.WriterID,
			})
			if err != nil {
				WriteError(w, http.StatusInternalServerError, err.Error())
				return
			}
			WriteJSON(w, http.StatusCreated, map[string]any{"message": "novel created", "novel_id": novelID})
		default:
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

func DeleteNovelHandler(novelService service.NovelService, writerService service.WriterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		novelID, err := extractNovelIDFromPath(r.URL.Path)
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid novel id")
			return
		}

		userID, ok := middleware.GetUserIDFromContext(r.Context())
		if !ok || userID == 0 {
			WriteError(w, http.StatusUnauthorized, "unauthorized: ไม่พบข้อมูลสิทธิ์ผู้ใช้งานหรือโทเคนไม่ถูกต้อง")
			return
		}

		writer, err := writerService.GetWriterByUserID(int(userID))
		if err != nil || writer == nil {
			WriteError(w, http.StatusForbidden, "forbidden: คุณยังไม่ใช่นักเขียนที่ได้รับอนุมัติ")
			return
		}

		novelDetail, err := novelService.GetNovelDetail(novelID)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		novelPtr, ok := novelDetail.(*models.Novel)
		if !ok || novelPtr == nil {
			WriteError(w, http.StatusInternalServerError, "failed to load novel details")
			return
		}

		if novelPtr.AuthorID != writer.WriterID {
			WriteError(w, http.StatusForbidden, "forbidden: คุณไม่มีสิทธิ์ลบนิยายนี้")
			return
		}

		if err := novelService.DeleteNovel(novelID); err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		WriteJSON(w, http.StatusOK, map[string]string{"message": "novel deleted"})
	}
}

func extractNovelIDFromPath(urlPath string) (int, error) {
	if strings.HasPrefix(urlPath, "/novels/") {
		return extractIDFromPath(urlPath, "/novels/")
	}
	if strings.HasPrefix(urlPath, "/api/v1/writer/novels/") {
		return extractIDFromPath(urlPath, "/api/v1/writer/novels/")
	}
	return 0, errors.New("invalid path")
}

func NovelSubRouteHandler(sceneService service.SceneService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/novels/")
		if !strings.HasSuffix(path, "/start") {
			http.NotFound(w, r)
			return
		}

		idStr := strings.TrimSuffix(path, "/start")
		id, err := strconv.Atoi(strings.Trim(idStr, "/"))
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid novel id")
			return
		}

		response, err := sceneService.GetStartScene(id)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		WriteJSON(w, http.StatusOK, response)
	}
}
