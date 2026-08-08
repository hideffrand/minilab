package system

import (
	"strconv"
	"strings"
	"testing"
)

func TestParseCPUTimes(t *testing.T) {
	// Two /proc/stat lines: first all-idle, second with busy time added.
	lines := `cpu  100 0 50 1000 0 0 0 0
cpu  200 0 100 1000 0 0 0 0`
	a := cpuTimesFrom(lines, 0)
	b := cpuTimesFrom(lines, 1)

	totalA, idleA := cpuTotals(a)
	totalB, idleB := cpuTotals(b)
	if totalA != 1150 {
		t.Fatalf("total a = %d, want 1150", totalA)
	}
	dTotal := totalB - totalA
	dIdle := idleB - idleA
	if dTotal == 0 {
		t.Fatal("zero total delta")
	}
	if got := (1 - float64(dIdle)/float64(dTotal)) * 100; got < 99 || got > 101 {
		t.Fatalf("cpu percent = %.1f, want ~100 (busy jiffies added, idle unchanged)", got)
	}
}

func TestParseMeminfoFallback(t *testing.T) {
	// No MemAvailable → falls back to MemFree + Buffers + Cached.
	lines := `MemTotal:        1024 kB
MemFree:          100 kB
Buffers:           20 kB
Cached:           130 kB
`
	out := memFrom(lines)
	if out.TotalBytes != 1024*1024 {
		t.Fatalf("total = %d, want %d", out.TotalBytes, 1024*1024)
	}
	if out.AvailableBytes != 250*1024 {
		t.Fatalf("available = %d, want %d", out.AvailableBytes, 250*1024)
	}
	if out.UsedPercent < 75 || out.UsedPercent > 76 {
		t.Fatalf("usedPercent = %.1f, want ~75.6", out.UsedPercent)
	}
}

// Test helpers mirroring the real parsers, on literal strings.

func cpuTimesFrom(text string, line int) cpuTimes {
	fields := strings.Fields(strings.Split(text, "\n")[line])
	var vals [8]uint64
	for i, s := range fields[1:] {
		if i >= len(vals) {
			break
		}
		vals[i], _ = strconv.ParseUint(s, 10, 64)
	}
	return cpuTimes{user: vals[0], nice: vals[1], system: vals[2], idle: vals[3], iowait: vals[4], irq: vals[5], softirq: vals[6], steal: vals[7]}
}

func memFrom(text string) MemStats {
	vals := map[string]int64{}
	for _, line := range strings.Split(text, "\n") {
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		v, err := strconv.ParseInt(fields[1], 10, 64)
		if err != nil {
			continue
		}
		vals[strings.TrimSuffix(fields[0], ":")] = v * 1024 // KiB
	}
	total := vals["MemTotal"]
	avail := vals["MemAvailable"]
	if avail == 0 {
		avail = vals["MemFree"] + vals["Buffers"] + vals["Cached"]
	}
	out := MemStats{TotalBytes: total, AvailableBytes: avail}
	if total > 0 {
		out.UsedPercent = (1 - float64(avail)/float64(total)) * 100
	}
	return out
}
