package dto

// SystemStats is the JSON payload returned by GET /api/system/stats.
type SystemStats struct {
	Hostname      string     `json:"hostname"`
	OS            string     `json:"os"`
	UptimeSeconds int64      `json:"uptimeSeconds"`
	CPUPercent    float64    `json:"cpuPercent"`
	LoadAvg       [3]float64 `json:"loadAvg"`
	Memory        MemStats   `json:"memory"`
	Disk          DiskStats  `json:"disk"`
	Processes     int        `json:"processes"`
	TempsCelsius  []float64  `json:"tempsCelsius"`
}

type MemStats struct {
	TotalBytes     int64   `json:"totalBytes"`
	AvailableBytes int64   `json:"availableBytes"`
	UsedPercent    float64 `json:"usedPercent"`
}

type DiskStats struct {
	TotalBytes     int64   `json:"totalBytes"`
	UsedBytes      int64   `json:"usedBytes"`
	AvailableBytes int64   `json:"availableBytes"`
	UsedPercent    float64 `json:"usedPercent"`
}
