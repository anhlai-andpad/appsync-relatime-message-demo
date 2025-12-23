package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

const mutationClientOwner = `
mutation PublishMessage($content: String!, $sender: String!, $tenantID: Int!, $propertyID: Int!, $orderID: Int!) {
  publishMessage(content: $content, sender: $sender, tenantID: $tenantID, propertyID: $propertyID, orderID: $orderID) {
    id
    content
    sender
    shareId
    createdAt
    tenantID
    propertyID
    orderID
    constructionID
  }
}
`

const mutationOwner = `
mutation PublishMessage($content: String!, $sender: String!, $shareId: String!, $constructionID: String) {
  publishMessage(content: $content, sender: $sender, shareId: $shareId, constructionID: $constructionID) {
    id
    content
    sender
    shareId
    createdAt
    tenantID
    propertyID
    orderID
    constructionID
  }
}
`

const mutationOwnerSimple = `
mutation PublishMessage($content: String!, $sender: String!, $shareId: String!) {
  publishMessage(content: $content, sender: $sender, shareId: $shareId) {
    id
    content
    sender
    shareId
    createdAt
    tenantID
    propertyID
    orderID
    constructionID
  }
}
`

type GraphQLRequest struct {
	Query     string                 `json:"query"`
	Variables map[string]interface{} `json:"variables"`
}

func testClientOwner(endpoint string) {
	fmt.Println("\n=== Testing client-owner parameters ===")
	reqBody := GraphQLRequest{
		Query: mutationClientOwner,
		Variables: map[string]interface{}{
			"content":    "[client-owner] message from golang 🚀",
			"sender":     "golang-client-owner",
			"tenantID":   1,
			"propertyID": 1,
			"orderID":    1,
		},
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", endpoint, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "aaaa") // Lambda authorizer token

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	resultJSON, _ := json.MarshalIndent(result, "", "  ")
	fmt.Printf("Status: %s\n", resp.Status)
	fmt.Printf("Response: %s\n", resultJSON)
}

func testOwner(endpoint string) {
	fmt.Println("\n=== Testing owner parameters (with constructionID) ===")
	reqBody := GraphQLRequest{
		Query: mutationOwner,
		Variables: map[string]interface{}{
			"content":        "[go][owner] message from golang (owner) 🚀",
			"sender":         "golang-owner",
			"shareId":        "8ec22adf-42d8-41dc-9f7a-87e7d1990d02",
			"constructionID": "1a9e6d41-1042-410a-acb2-28016bca3354",
		},
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", endpoint, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "aaaa") // Lambda authorizer token

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	resultJSON, _ := json.MarshalIndent(result, "", "  ")
	fmt.Printf("Status: %s\n", resp.Status)
	fmt.Printf("Response: %s\n", resultJSON)
}

func testOwnerSimple(endpoint string) {
	fmt.Println("\n=== Testing owner parameters (shareId only) ===")
	reqBody := GraphQLRequest{
		Query: mutationOwnerSimple,
		Variables: map[string]interface{}{
			"content": "[owner] message from golang 🚀",
			"sender":  "7179984e-bc2b-452b-bdbb-09f4b07b88f2",
			"shareId": "room-1",
		},
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", endpoint, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "aaaa") // Lambda authorizer token

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	resultJSON, _ := json.MarshalIndent(result, "", "  ")
	fmt.Printf("Status: %s\n", resp.Status)
	fmt.Printf("Response: %s\n", resultJSON)
}

func main() {
	endpoint := os.Getenv("APPSYNC_ENDPOINT")
	if endpoint == "" {
		panic("APPSYNC_ENDPOINT is required")
	}

	// Test client-owner parameters
	testClientOwner(endpoint)

	// Test owner parameters (with constructionID)
	testOwner(endpoint)

	// Test owner parameters (shareId only)
	testOwnerSimple(endpoint)
}
