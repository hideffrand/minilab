package dto

// PairingPayload is the payload embedded in the pairing code the mobile app
// decodes (see src/utils/pairingCode.ts on the app side — must stay in sync).
type PairingPayload struct {
	Name    string `json:"name"`
	BaseURL string `json:"baseUrl"`
	APIKey  string `json:"apiKey"`
}
