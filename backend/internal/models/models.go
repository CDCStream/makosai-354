package models

import "time"


// QuestionType represents different types of questions
type QuestionType string

const (
	MultipleChoice QuestionType = "multiple_choice"
	FillBlank      QuestionType = "fill_blank"
	TrueFalse      QuestionType = "true_false"
	ShortAnswer    QuestionType = "short_answer"
	Essay          QuestionType = "essay"
)

// Difficulty represents worksheet difficulty levels
type Difficulty string

const (

	Easy   Difficulty = "easy"
	Medium Difficulty = "medium"
	Hard   Difficulty = "hard"
)


// Question represents a single question in a worksheet
type Question struct {
	ID            string      `json:"id"`
	Type          string      `json:"type"`
	Question      string      `json:"question"`
	Options       []string    `json:"options,omitempty"`
	CorrectAnswer interface{} `json:"correct_answer,omitempty"`
	Explanation   string      `json:"explanation,omitempty"`
	Points        int         `json:"points"`
	Image         string      `json:"image,omitempty"`
	LatexDiagram  string      `json:"latex_diagram,omitempty"`
}


// Worksheet represents a generated worksheet
type Worksheet struct {
	ID                     string     `json:"id"`
	Title                  string     `json:"title"`
	Subject                string     `json:"subject"`
	Topic                  string     `json:"topic"`
	GradeLevel             string     `json:"grade_level"`
	Difficulty             string     `json:"difficulty"`
	Language               string     `json:"language"`
	Questions              []Question `json:"questions"`
	IncludeAnswerKey       bool       `json:"include_answer_key"`
	AdditionalInstructions string     `json:"additional_instructions,omitempty"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
	Status                 string     `json:"status"`
	Downloads              int        `json:"downloads"`
}

// WorksheetGeneratorInput represents the input for worksheet generation
type WorksheetGeneratorInput struct {
	Topic                  string   `json:"topic"`
	Subject                string   `json:"subject"`
	GradeLevel             string   `json:"grade_level"`
	Difficulty             string   `json:"difficulty"`
	QuestionCount          int      `json:"question_count"`
	QuestionTypes          []string `json:"question_types"`
	Language               string   `json:"language"`
	IncludeAnswerKey       bool     `json:"include_answer_key"`
	AdditionalInstructions string   `json:"additional_instructions,omitempty"`
}


// GenerationResponse represents the API response for worksheet generation
type GenerationResponse struct {
	Success   bool       `json:"success"`
	Worksheet *Worksheet `json:"worksheet,omitempty"`
	Error     string     `json:"error,omitempty"`
}


// User represents a user account
type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Password  string    `json:"-"`
	Plan      string    `json:"plan"`
	CreatedAt time.Time `json:"created_at"`
}


// AuthResponse represents authentication response
type AuthResponse struct {
	Success bool   `json:"success"`
	Token   string `json:"token,omitempty"`
	User    *User  `json:"user,omitempty"`
	Error   string `json:"error,omitempty"`
}

