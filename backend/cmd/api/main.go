package main

import (
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"

	"github.com/makosai/backend/internal/ai"
	"github.com/makosai/backend/internal/handlers"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Get port
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🦈 Starting Makos.ai API on port %s", port)

	// Initialize AI generator
	var generator ai.Generator
	anthropicKey := os.Getenv("ANTHROPIC_API_KEY")
	openAIKey := os.Getenv("OPENAI_API_KEY")

	if anthropicKey != "" {
		generator = ai.NewAnthropicGenerator(anthropicKey)
		log.Println("✓ Using Anthropic Claude for AI generation")
	} else if openAIKey != "" {
		generator = ai.NewOpenAIGenerator(openAIKey)
		log.Println("✓ Using OpenAI for AI generation")
	} else {
		generator = ai.NewMockGenerator()
		log.Println("⚠ No AI API key found, using mock generator")
	}

	// Initialize handlers
	worksheetHandler := handlers.NewWorksheetHandler(generator)
	authHandler := handlers.NewAuthHandler()

	// Initialize Fiber
	app := fiber.New(fiber.Config{
		AppName: "Makos.ai API v1.0",
	})

	// Middleware
	app.Use(logger.New())
	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: os.Getenv("ALLOWED_ORIGINS"),
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "healthy",
			"service": "makosai-api",
			"version": "1.0.0",
			"time":    time.Now().Format(time.RFC3339),
		})
	})

	// API routes
	api := app.Group("/api")

	// Auth routes
	auth := api.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)
	auth.Post("/logout", authHandler.Logout)
	auth.Get("/profile", authHandler.GetProfile)
	auth.Put("/profile", authHandler.UpdateProfile)

	// Worksheet routes
	worksheets := api.Group("/worksheets")
	worksheets.Post("/generate", worksheetHandler.GenerateWorksheet)
	worksheets.Post("/generate-stream", worksheetHandler.GenerateWorksheetStream)
	worksheets.Get("/", worksheetHandler.GetWorksheets)
	worksheets.Get("/options", worksheetHandler.GetOptions)
	worksheets.Get("/:id", worksheetHandler.GetWorksheet)
	worksheets.Put("/:id", worksheetHandler.UpdateWorksheet)
	worksheets.Delete("/:id", worksheetHandler.DeleteWorksheet)
	worksheets.Get("/:id/export/pdf", worksheetHandler.ExportWorksheetPDF)

	// Start server
	log.Fatal(app.Listen(":" + port))
}
