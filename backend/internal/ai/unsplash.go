package ai

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type UnsplashImage struct {
	ID          string `json:"id"`
	Description string `json:"description"`
	URLs        struct {
		Raw     string `json:"raw"`
		Full    string `json:"full"`
		Regular string `json:"regular"`
		Small   string `json:"small"`
		Thumb   string `json:"thumb"`
	} `json:"urls"`
	User struct {
		Name string `json:"name"`
	} `json:"user"`
}

type UnsplashSearchResponse struct {
	Total      int             `json:"total"`
	TotalPages int             `json:"total_pages"`
	Results    []UnsplashImage `json:"results"`
}

// SearchUnsplashImage searches for an image on Unsplash and returns a random URL from results
func SearchUnsplashImage(query string) (string, error) {
	accessKey := os.Getenv("UNSPLASH_ACCESS_KEY")
	if accessKey == "" {
		return "", fmt.Errorf("UNSPLASH_ACCESS_KEY not set")
	}

	// Build the search URL - get more results for variety
	searchURL := fmt.Sprintf(
		"https://api.unsplash.com/search/photos?query=%s&per_page=10&orientation=landscape",
		url.QueryEscape(query),
	)

	req, err := http.NewRequest("GET", searchURL, nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Client-ID %s", accessKey))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Unsplash API error: status %d", resp.StatusCode)
	}

	var searchResp UnsplashSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
		return "", err
	}

	if len(searchResp.Results) == 0 {
		return "", fmt.Errorf("no images found for query: %s", query)
	}

	// Return a random image from results for variety
	rand.Seed(time.Now().UnixNano())
	randomIndex := rand.Intn(len(searchResp.Results))
	return searchResp.Results[randomIndex].URLs.Small, nil
}

// extractKeywords extracts meaningful keywords from question text
func extractKeywords(text string) []string {
	// Common words to ignore
	stopWords := map[string]bool{
		"the": true, "a": true, "an": true, "is": true, "are": true,
		"what": true, "which": true, "how": true, "many": true, "much": true,
		"does": true, "do": true, "has": true, "have": true, "can": true,
		"will": true, "would": true, "should": true, "could": true,
		"this": true, "that": true, "these": true, "those": true,
		"and": true, "or": true, "but": true, "of": true, "to": true,
		"in": true, "on": true, "at": true, "for": true, "with": true,
		"from": true, "by": true, "about": true, "into": true,
		"says": true, "give": true, "gives": true, "us": true, "we": true,
	}

	words := strings.Fields(strings.ToLower(text))
	var keywords []string

	for _, word := range words {
		// Clean punctuation
		word = strings.Trim(word, ".,?!:;\"'()[]")
		if len(word) > 2 && !stopWords[word] {
			keywords = append(keywords, word)
		}
	}

	// Return first 3 keywords max
	if len(keywords) > 3 {
		return keywords[:3]
	}
	return keywords
}

// GetImageForQuestion gets an appropriate image for a kindergarten question
func GetImageForQuestion(topic string, questionText string) string {
	// Extract keywords from question text for more specific search
	keywords := extractKeywords(questionText)

	var searchQuery string
	if len(keywords) > 0 {
		// Use question keywords for specific image
		searchQuery = strings.Join(keywords, " ") + " kids colorful"
	} else {
		// Fallback to topic
		searchQuery = topic + " kids education"
	}

	imageURL, err := SearchUnsplashImage(searchQuery)
	if err != nil {
		// Fallback to topic-based search
		imageURL, err = SearchUnsplashImage(topic + " children")
		if err != nil {
			// Final fallback
			imageURL, err = SearchUnsplashImage("kids learning colorful")
			if err != nil {
				return ""
			}
		}
	}
	return imageURL
}

