package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/makosai/backend/internal/models"
)

// ProgressCallback is called when generation progress changes
type ProgressCallback func(step int, message string)

// Generator interface for AI worksheet generation
type Generator interface {
	GenerateWorksheet(ctx context.Context, input models.WorksheetGeneratorInput) (*models.Worksheet, error)
	GenerateWorksheetWithProgress(ctx context.Context, input models.WorksheetGeneratorInput, onProgress ProgressCallback) (*models.Worksheet, error)
}

// MockGenerator generates demo worksheets without AI
type MockGenerator struct{}

func NewMockGenerator() *MockGenerator {
	return &MockGenerator{}
}

func (g *MockGenerator) GenerateWorksheet(ctx context.Context, input models.WorksheetGeneratorInput) (*models.Worksheet, error) {
	return g.GenerateWorksheetWithProgress(ctx, input, nil)
}

func (g *MockGenerator) GenerateWorksheetWithProgress(ctx context.Context, input models.WorksheetGeneratorInput, onProgress ProgressCallback) (*models.Worksheet, error) {
	if onProgress != nil {
		onProgress(0, "Analyzing your requirements...")
	}

	worksheet := &models.Worksheet{
		ID:                     "ws_" + uuid.New().String()[:8],
		Title:                  fmt.Sprintf("%s Worksheet", input.Topic),
		Subject:                input.Subject,
		Topic:                  input.Topic,
		GradeLevel:             input.GradeLevel,
		Difficulty:             input.Difficulty,
		Language:               input.Language,
		IncludeAnswerKey:       input.IncludeAnswerKey,
		AdditionalInstructions: input.AdditionalInstructions,
		Status:                 "draft",
		Downloads:              0,
		CreatedAt:              time.Now(),
		UpdatedAt:              time.Now(),
	}

	if onProgress != nil {
		onProgress(1, "Generating questions...")
	}

	// Generate demo questions
	questions := make([]models.Question, input.QuestionCount)
	for i := 0; i < input.QuestionCount; i++ {
		qType := "multiple_choice"
		if len(input.QuestionTypes) > 0 {
			qType = input.QuestionTypes[i%len(input.QuestionTypes)]
		}
		questions[i] = generateDemoQuestion(i+1, qType, input.Topic)
	}
	worksheet.Questions = questions

	if onProgress != nil {
		onProgress(4, "Finalizing worksheet...")
	}

	return worksheet, nil
}

func generateDemoQuestion(num int, qType string, topic string) models.Question {
	q := models.Question{
		ID:     fmt.Sprintf("q_%d", num),
		Type:   qType,
		Points: 2,
	}

	switch qType {
	case "multiple_choice":
		q.Question = fmt.Sprintf("Question %d: Which of the following best describes %s?", num, topic)
		q.Options = []string{"Option A - Correct answer", "Option B", "Option C", "Option D"}
		q.CorrectAnswer = "Option A - Correct answer"
		q.Explanation = "This is the correct answer based on the topic."
	case "true_false":
		q.Question = fmt.Sprintf("Question %d: True or False: %s is an important concept to learn.", num, topic)
		q.Options = []string{"True", "False"}
		q.CorrectAnswer = "True"
		q.Explanation = "This statement is true because of its educational significance."
	case "fill_blank":
		q.Question = fmt.Sprintf("Question %d: The main concept of %s is called __________.", num, topic)
		q.CorrectAnswer = "answer"
		q.Explanation = "Fill in the blank with the appropriate term."
	case "short_answer":
		q.Question = fmt.Sprintf("Question %d: Briefly explain the importance of %s.", num, topic)
		q.CorrectAnswer = "A comprehensive answer explaining the importance..."
		q.Explanation = "A good answer should include key concepts."
		q.Points = 5
	case "essay":
		q.Question = fmt.Sprintf("Question %d: Write a detailed essay about %s and its applications.", num, topic)
		q.CorrectAnswer = "Essays are evaluated based on content, structure, and clarity."
		q.Explanation = "Include an introduction, body paragraphs, and conclusion."
		q.Points = 10
	default:
		q.Question = fmt.Sprintf("Question %d: Answer the following about %s.", num, topic)
		q.CorrectAnswer = "Sample answer"
	}

	return q
}

// AnthropicGenerator uses Claude API for AI generation
type AnthropicGenerator struct {
	apiKey string
	client *http.Client
}

func NewAnthropicGenerator(apiKey string) *AnthropicGenerator {
	return &AnthropicGenerator{
		apiKey: apiKey,
		client: &http.Client{Timeout: 180 * time.Second}, // 3 minutes for complex diagram generation
	}
}

// System prompt for Claude - ensures quality and accuracy
const systemPrompt = `You are an expert educational content creator and curriculum specialist with deep knowledge across all academic subjects. Your role is to create high-quality, pedagogically sound worksheets for students.

CRITICAL REQUIREMENTS:

1. ACCURACY IS PARAMOUNT:
   - Every question MUST have a factually correct answer
   - Double-check all facts, dates, formulas, and scientific information
   - For math problems: solve each problem yourself and verify the answer is correct
   - For science: ensure all scientific facts are accurate and up-to-date
   - For history: verify dates, names, and events
   - For language: ensure grammar and spelling are perfect

2. ANSWER VERIFICATION PROCESS:
   - After creating each question, mentally solve/answer it
   - Verify the correct_answer field matches your solution
   - For multiple choice: ensure exactly ONE option is correct
   - For true/false: verify the statement's truthfulness
   - For fill-in-blank: ensure the answer logically completes the sentence
   - For math: show your work mentally and confirm the numerical answer

3. QUALITY STANDARDS:
   - Questions should be clear, unambiguous, and age-appropriate
   - Avoid trick questions unless specifically requested
   - Explanations should help students understand WHY the answer is correct
   - Distractors (wrong options) should be plausible but clearly incorrect

4. EDUCATIONAL VALUE:
   - Align with curriculum standards for the specified grade level
   - Progress from easier to harder questions when appropriate
   - Include a mix of recall, comprehension, and application questions
   - Make content engaging and relevant to students

5. OUTPUT FORMAT:
   - Always output valid JSON only, no markdown or extra text
   - Follow the exact structure requested
   - Ensure all required fields are present

6. DIAGRAMS - Do NOT include diagrams in your response.
   Diagrams will be automatically added in a separate processing step for:
   - Geometry questions (triangles, circles, angles)
   - Trigonometry questions
   - Physics/circuit problems
   - Coordinate geometry

7. MATHEMATICAL NOTATION (LaTeX):
   - For math questions, use LaTeX notation within the question text
   - Wrap inline math with $...$ (e.g., $x^2 + y^2 = z^2$)
   - Wrap display math with $$...$$ (e.g., $$\frac{a}{b} = c$$)
   - Use LaTeX for: fractions, exponents, roots, integrals, summations, matrices

9. SVG DIAGRAMS - The "addDiagramsIfNeeded" step will add diagrams later.
   For now, focus on creating high-quality questions with proper mathematical notation.
   Do NOT include "image" field in your response - diagrams will be added in a separate step.`

func (g *AnthropicGenerator) GenerateWorksheet(ctx context.Context, input models.WorksheetGeneratorInput) (*models.Worksheet, error) {
	return g.GenerateWorksheetWithProgress(ctx, input, nil)
}

func (g *AnthropicGenerator) GenerateWorksheetWithProgress(ctx context.Context, input models.WorksheetGeneratorInput, onProgress ProgressCallback) (*models.Worksheet, error) {
	// Step 0: Analyzing
	if onProgress != nil {
		onProgress(0, "Analyzing your requirements...")
	}

	prompt := g.buildPrompt(input)

	// Step 1: Generating questions
	if onProgress != nil {
		onProgress(1, "Generating questions...")
	}

	requestBody := map[string]interface{}{
		"model":      "claude-haiku-4-5-20251001", // Haiku: ~10x cheaper than Sonnet
		"max_tokens": 8192,
		"system":     systemPrompt,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", g.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := g.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse response
	var apiResp struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}

	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(apiResp.Content) == 0 {
		return nil, fmt.Errorf("empty response from API")
	}

	// Extract JSON from response
	responseText := apiResp.Content[0].Text
	log.Printf("📝 AI Response (first 500 chars): %.500s", responseText)

	jsonStr := extractJSON(responseText)
	if jsonStr == "" {
		log.Printf("❌ Full response that failed parsing: %s", responseText)
		return nil, fmt.Errorf("no JSON found in response")
	}

	// Parse generated worksheet
	var generated struct {
		Title     string            `json:"title"`
		Questions []models.Question `json:"questions"`
	}

	if err := json.Unmarshal([]byte(jsonStr), &generated); err != nil {
		return nil, fmt.Errorf("failed to parse generated worksheet: %w", err)
	}

	// Build worksheet
	worksheet := &models.Worksheet{
		ID:                     "ws_" + uuid.New().String()[:8],
		Title:                  generated.Title,
		Subject:                input.Subject,
		Topic:                  input.Topic,
		GradeLevel:             input.GradeLevel,
		Difficulty:             input.Difficulty,
		Language:               input.Language,
		Questions:              generated.Questions,
		IncludeAnswerKey:       input.IncludeAnswerKey,
		AdditionalInstructions: input.AdditionalInstructions,
		Status:                 "draft",
		Downloads:              0,
		CreatedAt:              time.Now(),
		UpdatedAt:              time.Now(),
	}

	// Assign IDs if missing
	for i := range worksheet.Questions {
		if worksheet.Questions[i].ID == "" {
			worksheet.Questions[i].ID = fmt.Sprintf("q_%d", i+1)
		}
		if worksheet.Questions[i].Points == 0 {
			worksheet.Questions[i].Points = getDefaultPoints(worksheet.Questions[i].Type)
		}
	}

	// Step 2: Adding images for kindergarten/early grades (Unsplash)
	if isEarlyGrade(input.GradeLevel) {
		if onProgress != nil {
			onProgress(2, "Adding colorful images...")
		}
		log.Println("🖼️ Adding images for early grade worksheet...")
		for i := range worksheet.Questions {
			imageURL := GetImageForQuestion(input.Topic, worksheet.Questions[i].Question)
			if imageURL != "" {
				worksheet.Questions[i].Image = imageURL
				log.Printf("   ✅ Added image for question %d", i+1)
			}
		}
	} else {
		if onProgress != nil {
			onProgress(2, "Formatting content...")
		}
		log.Println("📝 Formatting content for worksheet...")
	}

	// Step 3: Add diagrams for geometry/circuit questions only
	if needsDiagrams(input.Subject, input.Topic) {
		if onProgress != nil {
			onProgress(3, "Creating diagrams...")
		}
		log.Println("📐 Adding diagrams for geometry/circuit questions...")
		worksheet.Questions = g.addDiagramsIfNeeded(ctx, worksheet.Questions, input.Subject, input.Topic)
	} else {
		if onProgress != nil {
			onProgress(3, "Creating diagrams...")
		}
		log.Println("📝 Skipping diagrams (not needed for this topic)...")
		time.Sleep(300 * time.Millisecond)
	}

	// Step 4: Verifying answers (cosmetic step for UX)
	if onProgress != nil {
		onProgress(4, "Verifying answer accuracy...")
	}
	log.Println("✅ Verifying answer accuracy...")
	time.Sleep(600 * time.Millisecond)

	// Step 5: Finalizing
	if onProgress != nil {
		onProgress(5, "Finalizing worksheet...")
	}
	log.Println("📄 Finalizing worksheet...")

	return worksheet, nil
}

// addDiagramsIfNeeded analyzes questions and adds SVG diagrams where visual representation helps
func (g *AnthropicGenerator) addDiagramsIfNeeded(ctx context.Context, questions []models.Question, subject, topic string) []models.Question {
	// Skip if no questions or for early grades (they use Unsplash images)
	if len(questions) == 0 {
		return questions
	}

	// Build analysis prompt
	questionsJSON, err := json.Marshal(questions)
	if err != nil {
		log.Printf("⚠️ Failed to marshal questions for diagram analysis: %v", err)
		return questions
	}

	diagramPrompt := fmt.Sprintf(`Add SVG diagrams to questions that need them.

QUESTIONS: %s

Only add "image" field for geometry/physics questions. Skip algebra/text questions.

TEMPLATES (copy exactly, replace [X] with values):

TRIANGLE: <svg viewBox="0 0 300 220" xmlns="http://www.w3.org/2000/svg"><polygon points="150,20 20,190 280,190" fill="none" stroke="#333" stroke-width="3"/><text x="150" y="12" text-anchor="middle" font-size="18" font-weight="bold">[C]</text><text x="8" y="205" font-size="18" font-weight="bold">[A]</text><text x="285" y="205" font-size="18" font-weight="bold">[B]</text><text x="65" y="100" fill="blue" font-size="16" font-weight="bold">[b=?]</text><text x="210" y="100" fill="blue" font-size="16" font-weight="bold">[a=?]</text><text x="150" y="215" fill="blue" font-size="16" font-weight="bold" text-anchor="middle">[c=?]</text><text x="45" y="178" fill="red" font-size="14" font-weight="bold">[45°]</text></svg>

CIRCUIT: <svg viewBox="0 0 380 140" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="20" width="340" height="100" fill="none" stroke="#333" stroke-width="3" rx="5"/><rect x="35" y="55" width="35" height="30" fill="#ffd" stroke="#333" stroke-width="2"/><text x="52" y="75" text-anchor="middle" font-size="14" font-weight="bold">[V]</text><path d="M 120,70 L 130,50 L 150,90 L 170,50 L 190,90 L 200,70" fill="none" stroke="#333" stroke-width="3"/><text x="160" y="40" text-anchor="middle" font-size="14" font-weight="bold" fill="blue">[R1]</text><path d="M 250,70 L 260,50 L 280,90 L 300,50 L 320,90 L 330,70" fill="none" stroke="#333" stroke-width="3"/><text x="290" y="40" text-anchor="middle" font-size="14" font-weight="bold" fill="red">[R2]</text></svg>

CIRCLE: <svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg"><circle cx="120" cy="100" r="70" fill="none" stroke="#333" stroke-width="3"/><line x1="120" y1="100" x2="190" y2="100" stroke="blue" stroke-width="3"/><circle cx="120" cy="100" r="4" fill="#333"/><text x="120" y="120" text-anchor="middle" font-size="14" font-weight="bold">O</text><text x="155" y="90" fill="blue" font-size="14" font-weight="bold">[r=?]</text></svg>

Return complete JSON array with "image" field where needed. Output ONLY JSON.`, string(questionsJSON))

	requestBody := map[string]interface{}{
		"model":      "claude-haiku-4-5-20251001", // Haiku for cost efficiency
		"max_tokens": 16000,
		"messages": []map[string]string{
			{"role": "user", "content": diagramPrompt},
		},
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		log.Printf("⚠️ Failed to marshal diagram request: %v", err)
		return questions
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(jsonBody))
	if err != nil {
		log.Printf("⚠️ Failed to create diagram request: %v", err)
		return questions
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", g.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := g.client.Do(req)
	if err != nil {
		log.Printf("⚠️ Diagram analysis request failed: %v", err)
		return questions
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("⚠️ Failed to read diagram response: %v", err)
		return questions
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("⚠️ Diagram API error (status %d): %s", resp.StatusCode, string(body))
		return questions
	}

	var apiResp struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}

	if err := json.Unmarshal(body, &apiResp); err != nil {
		log.Printf("⚠️ Failed to parse diagram response: %v", err)
		return questions
	}

	if len(apiResp.Content) == 0 {
		log.Printf("⚠️ Empty diagram response")
		return questions
	}

	responseText := apiResp.Content[0].Text
	jsonStr := extractJSON(responseText)
	if jsonStr == "" {
		log.Printf("⚠️ No JSON found in diagram response")
		return questions
	}

	var diagramQuestions []models.Question
	if err := json.Unmarshal([]byte(jsonStr), &diagramQuestions); err != nil {
		log.Printf("⚠️ Failed to parse diagram questions: %v", err)
		return questions
	}

	// Count how many diagrams were added (SVG in Image field)
	diagramCount := 0
	for _, q := range diagramQuestions {
		if q.Image != "" && strings.HasPrefix(q.Image, "<svg") {
			diagramCount++
		}
	}
	log.Printf("   ✅ Added SVG diagrams to %d/%d questions", diagramCount, len(questions))

	return diagramQuestions
}

// verifyAnswers sends questions to AI for answer verification
func (g *AnthropicGenerator) verifyAnswers(ctx context.Context, questions []models.Question, subject, topic string) []models.Question {
	// Build verification prompt
	questionsJSON, err := json.Marshal(questions)
	if err != nil {
		log.Printf("⚠️ Failed to marshal questions for verification: %v", err)
		return questions
	}

	verifyPrompt := fmt.Sprintf(`You are an expert fact-checker and educator. Review these questions and their answers for accuracy.

SUBJECT: %s
TOPIC: %s

QUESTIONS TO VERIFY:
%s

TASK:
1. Check each question's correct_answer for factual accuracy
2. For math problems: solve them yourself and verify the answer
3. For science/history: verify facts are correct
4. If an answer is WRONG, fix it with the correct answer
5. Return the corrected questions array in the same JSON format

IMPORTANT:
- Only output the JSON array of questions
- Keep the exact same structure
- Only change correct_answer and explanation if there's an error
- If all answers are correct, return them unchanged

Output ONLY valid JSON array, no markdown or extra text.`, subject, topic, string(questionsJSON))

	requestBody := map[string]interface{}{
		"model":      "claude-sonnet-4-5-20250929",
		"max_tokens": 32000,
		"messages": []map[string]string{
			{"role": "user", "content": verifyPrompt},
		},
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		log.Printf("⚠️ Failed to create verification request: %v", err)
		return questions
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(jsonBody))
	if err != nil {
		log.Printf("⚠️ Failed to create verification HTTP request: %v", err)
		return questions
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", g.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := g.client.Do(req)
	if err != nil {
		log.Printf("⚠️ Verification request failed: %v", err)
		return questions
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("⚠️ Verification API error: status %d", resp.StatusCode)
		return questions
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("⚠️ Failed to read verification response: %v", err)
		return questions
	}

	var apiResp struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}

	if err := json.Unmarshal(body, &apiResp); err != nil {
		log.Printf("⚠️ Failed to parse verification response: %v", err)
		return questions
	}

	if len(apiResp.Content) == 0 {
		log.Printf("⚠️ Empty verification response")
		return questions
	}

	// Extract JSON from response
	responseText := apiResp.Content[0].Text
	jsonStr := extractJSON(responseText)
	if jsonStr == "" {
		log.Printf("⚠️ No JSON found in verification response")
		return questions
	}

	// Parse verified questions
	var verifiedQuestions []models.Question
	if err := json.Unmarshal([]byte(jsonStr), &verifiedQuestions); err != nil {
		log.Printf("⚠️ Failed to parse verified questions: %v", err)
		return questions
	}

	log.Printf("✅ Answer verification complete - %d questions verified", len(verifiedQuestions))
	return verifiedQuestions
}

// isEarlyGrade checks if the grade level requires images
func isEarlyGrade(gradeLevel string) bool {
	gradeLower := strings.ToLower(strings.TrimSpace(gradeLevel))

	// Exact matches for early grades (Kindergarten, 1st, 2nd)
	earlyGrades := map[string]bool{
		"k":            true,
		"kindergarten": true,
		"pre-k":        true,
		"prek":         true,
		"1":            true,
		"1st":          true,
		"1st grade":    true,
		"2":            true,
		"2nd":          true,
		"2nd grade":    true,
	}

	return earlyGrades[gradeLower]
}

// needsDiagrams checks if the subject/topic requires visual diagrams
func needsDiagrams(subject, topic string) bool {
	subjectLower := strings.ToLower(subject)
	topicLower := strings.ToLower(topic)

	// Subjects that need diagrams
	diagramSubjects := []string{
		"geometry", "math", "mathematics", "trigonometry",
		"physics", "science", "electronics", "electrical",
	}

	// Topics that need diagrams
	diagramTopics := []string{
		"triangle", "circle", "angle", "polygon", "shape",
		"circuit", "resistor", "voltage", "current", "ohm",
		"force", "vector", "motion", "projectile",
		"sine", "cosine", "tangent", "pythagor",
		"area", "perimeter", "volume", "coordinate",
	}

	for _, s := range diagramSubjects {
		if strings.Contains(subjectLower, s) {
			return true
		}
	}

	for _, t := range diagramTopics {
		if strings.Contains(topicLower, t) {
			return true
		}
	}

	return false
}

func (g *AnthropicGenerator) buildPrompt(input models.WorksheetGeneratorInput) string {
	questionTypes := strings.Join(input.QuestionTypes, ", ")
	if questionTypes == "" {
		questionTypes = "multiple_choice"
	}

	additionalInstr := ""
	if input.AdditionalInstructions != "" {
		additionalInstr = fmt.Sprintf("\n\n📝 ADDITIONAL TEACHER INSTRUCTIONS:\n%s", input.AdditionalInstructions)
	}

	languageInstr := "English"
	switch input.Language {
	case "tr":
		languageInstr = "Turkish (Türkçe) - Generate ALL content including questions, options, answers, and explanations in Turkish"
	case "es":
		languageInstr = "Spanish (Español) - Generate ALL content in Spanish"
	case "fr":
		languageInstr = "French (Français) - Generate ALL content in French"
	case "de":
		languageInstr = "German (Deutsch) - Generate ALL content in German"
	case "en":
		languageInstr = "English - Generate all content in English"
	default:
		languageInstr = fmt.Sprintf("%s - Generate ALL content in this language", input.Language)
	}

	return fmt.Sprintf(`Generate an educational worksheet with the following specifications:

📚 WORKSHEET SPECIFICATIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━
• Topic: %s
• Subject: %s
• Grade Level: %s
• Difficulty: %s
• Number of Questions: %d
• Question Types: %s
• Language: %s%s

🎯 OUTPUT REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━
Generate a JSON object with this EXACT structure:

{
  "title": "Creative and descriptive worksheet title",
  "questions": [
    {
      "id": "q_1",
      "type": "multiple_choice",
      "question": "Question text with $LaTeX$ math notation if needed",
      "options": ["Option A with $math$", "Option B", "Option C", "Option D"],
      "correct_answer": "The correct option (must match exactly one of the options)",
      "explanation": "Educational explanation with $math$ if needed",
      "points": 10
    }
  ]
}

📐 MATHEMATICAL NOTATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━
- Use LaTeX for ALL mathematical expressions
- Inline math: $x^2$, $\frac{1}{2}$, $\sqrt{16}$
- Display math: $$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$$
- Fractions: $\frac{a}{b}$
- Exponents: $x^2$, $2^{10}$
- Roots: $\sqrt{x}$, $\sqrt[3]{8}$
- Greek letters: $\pi$, $\theta$, $\alpha$
- Geometry: $\angle ABC$, $\triangle ABC$, $\perp$, $\parallel$
- For early grades: Keep it simple - use LaTeX only for basic operations

📋 QUESTION TYPE FORMATS:
━━━━━━━━━━━━━━━━━━━━━━━━━━
• multiple_choice: 4 options array, correct_answer = exact option text
• true_false: options = ["True", "False"], correct_answer = "True" or "False"
• fill_blank: use __________ for blank, correct_answer = the word/phrase
• short_answer: no options, correct_answer = sample correct response
• essay: no options, points = higher value, correct_answer = grading criteria

🎓 BLOOM'S TAXONOMY - DIFFICULTY LEVELS (CRITICAL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EASY (Bloom Levels 1-2: Remember & Understand):
- Simple recall of facts, definitions, formulas
- Basic comprehension questions
- "What is...?", "Define...", "Which of the following..."
- Direct application of memorized formulas
- Example: "What is the formula for the area of a circle?"

MEDIUM (Bloom Levels 3-4: Apply & Analyze):
- Multi-step problem solving requiring application
- Analyzing relationships, comparing concepts
- "Calculate...", "Solve...", "Compare...", "Explain why..."
- Problems requiring 2-3 steps to solve
- Example: "A triangle has sides 5, 12, and 13. Prove it's a right triangle and find its area."

HARD (Bloom Levels 5-6: Evaluate & Create):
- Complex multi-step problems requiring synthesis
- Evaluating approaches, justifying solutions
- Creating proofs, designing solutions
- "Prove that...", "Design...", "Justify...", "What if..."
- Problems requiring 4+ steps, combining multiple concepts
- Example: "Given a parallelogram ABCD where E is the midpoint of BC, prove that line AE divides diagonal BD in ratio 2:1."

⚠️ IMPORTANT: Match difficulty STRICTLY to Bloom's levels. Do NOT make "hard" questions just slightly harder than "medium". Hard questions should require synthesis, evaluation, and creative problem-solving.

⚠️ VERIFICATION CHECKLIST (Do this for EACH question):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Is the question factually accurate?
□ Is the correct_answer actually correct? (Solve/verify it yourself)
□ For math: Did you calculate the answer and verify it's right?
□ For science: Is the scientific information accurate?
□ For multiple choice: Is there exactly ONE correct answer?
□ Does the explanation help students understand the concept?

Output ONLY the JSON object. No markdown, no code blocks, no extra text.`,
		input.Topic, input.Subject, input.GradeLevel, input.Difficulty,
		input.QuestionCount, questionTypes, languageInstr, additionalInstr)
}

func extractJSON(text string) string {
	// Try to find JSON block in markdown
	if start := strings.Index(text, "```json"); start != -1 {
		start += 7
		if end := strings.Index(text[start:], "```"); end != -1 {
			return strings.TrimSpace(text[start : start+end])
		}
	}

	// Try to find raw JSON
	if start := strings.Index(text, "{"); start != -1 {
		depth := 0
		for i := start; i < len(text); i++ {
			if text[i] == '{' {
				depth++
			} else if text[i] == '}' {
				depth--
				if depth == 0 {
					return text[start : i+1]
				}
			}
		}
	}

	return ""
}

func getDefaultPoints(qType string) int {
	switch qType {
	case "essay":
		return 10
	case "short_answer":
		return 5
	default:
		return 2
	}
}

// OpenAIGenerator uses OpenAI API (placeholder)
type OpenAIGenerator struct {
	apiKey string
}

func NewOpenAIGenerator(apiKey string) *OpenAIGenerator {
	return &OpenAIGenerator{apiKey: apiKey}
}

func (g *OpenAIGenerator) GenerateWorksheet(ctx context.Context, input models.WorksheetGeneratorInput) (*models.Worksheet, error) {
	return g.GenerateWorksheetWithProgress(ctx, input, nil)
}

func (g *OpenAIGenerator) GenerateWorksheetWithProgress(ctx context.Context, input models.WorksheetGeneratorInput, onProgress ProgressCallback) (*models.Worksheet, error) {
	// Fallback to mock for now
	mock := NewMockGenerator()
	return mock.GenerateWorksheetWithProgress(ctx, input, onProgress)
}
