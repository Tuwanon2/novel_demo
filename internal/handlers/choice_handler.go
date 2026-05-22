package handlers

import (
	"encoding/json"
	"net/http"

	"novel-be/internal/models"
	"novel-be/internal/service"
)

func CreateChoiceHandler(sceneService service.SceneService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req CreateChoiceRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if err := req.Validate(); err != nil {
			WriteError(w, http.StatusBadRequest, err.Error())
			return
		}

		choiceID, err := sceneService.CreateChoice(models.Choice{
			FromSceneID: req.FromSceneID,
			ToSceneID:   req.ToSceneID,
			Label:       req.Label,
		})
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		WriteJSON(w, http.StatusCreated, map[string]any{"message": "choice created", "choice_id": choiceID})
	}
}

func UpdateChoiceHandler(sceneService service.SceneService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		choiceID, err := extractIDFromPath(r.URL.Path, "/choices/")
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid choice id")
			return
		}

		var req UpdateChoiceRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if err := req.Validate(); err != nil {
			WriteError(w, http.StatusBadRequest, err.Error())
			return
		}

		choice := models.Choice{
			ChoiceID:  choiceID,
			ToSceneID: req.ToSceneID,
			Label:     req.Label,
		}

		if err := sceneService.UpdateChoice(choice); err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		WriteJSON(w, http.StatusOK, map[string]any{"message": "choice updated"})
	}
}

func DeleteChoiceHandler(sceneService service.SceneService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		choiceID, err := extractIDFromPath(r.URL.Path, "/choices/")
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid choice id")
			return
		}

		if err := sceneService.DeleteChoice(choiceID); err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		WriteJSON(w, http.StatusOK, map[string]any{"message": "choice deleted"})
	}
}
