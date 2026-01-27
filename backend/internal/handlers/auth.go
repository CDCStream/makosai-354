package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/makosai/backend/internal/models"
)

// AuthHandler handles authentication requests
type AuthHandler struct {
	users map[string]*models.User
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler() *AuthHandler {
	return &AuthHandler{
		users: make(map[string]*models.User),
	}
}

// Register handles POST /api/auth/register
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var input struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.AuthResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	if input.Email == "" || input.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.AuthResponse{
			Success: false,
			Error:   "Email and password are required",
		})
	}

	// Check if user exists
	for _, user := range h.users {
		if user.Email == input.Email {
			return c.Status(fiber.StatusConflict).JSON(models.AuthResponse{
				Success: false,
				Error:   "Email already registered",
			})
		}
	}

	// Create user
	user := &models.User{
		ID:        "user_" + uuid.New().String()[:8],
		Email:     input.Email,
		Name:      input.Name,
		Password:  input.Password, // In production, hash this!
		Plan:      "free",
		CreatedAt: time.Now(),
	}

	h.users[user.ID] = user

	return c.Status(fiber.StatusCreated).JSON(models.AuthResponse{
		Success: true,
		Token:   "demo_token_" + user.ID,
		User:    user,
	})
}

// Login handles POST /api/auth/login
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.AuthResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	// Find user
	var foundUser *models.User
	for _, user := range h.users {
		if user.Email == input.Email && user.Password == input.Password {
			foundUser = user
			break
		}
	}

	if foundUser == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(models.AuthResponse{
			Success: false,
			Error:   "Invalid email or password",
		})
	}

	return c.JSON(models.AuthResponse{
		Success: true,
		Token:   "demo_token_" + foundUser.ID,
		User:    foundUser,
	})
}

// Logout handles POST /api/auth/logout
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"success": true,
		"message": "Logged out successfully",
	})
}

// GetProfile handles GET /api/auth/profile
func (h *AuthHandler) GetProfile(c *fiber.Ctx) error {
	// In production, get user from token
	return c.JSON(fiber.Map{
		"success": true,
		"user": map[string]interface{}{
			"id":    "demo_user",
			"email": "demo@example.com",
			"name":  "Demo User",
			"plan":  "free",
		},
	})
}

// UpdateProfile handles PUT /api/auth/profile
func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"success": true,
		"message": "Profile updated",
	})
}

