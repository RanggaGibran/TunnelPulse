package monitor

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type Container struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Image   string `json:"image"`
	State   string `json:"state"`
	Health  string `json:"health"`
	Service string `json:"service,omitempty"`
	Slot    string `json:"slot,omitempty"`
}
type Source struct {
	Status      string      `json:"status"`
	CheckedAt   time.Time   `json:"checkedAt"`
	Error       string      `json:"error,omitempty"`
	Containers  []Container `json:"containers,omitempty"`
	Connections int         `json:"connections,omitempty"`
}
type Snapshot struct {
	Services []Service `json:"services"`
 Incidents []Incident `json:"incidents"`
 Docker Source `json:"docker"`
	Tunnel Source `json:"tunnel"`
}

func Docker(ctx context.Context, socket string) Source {
	result := Source{Status: "unknown", CheckedAt: time.Now().UTC()}
	transport := &http.Transport{DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, "unix", socket)
	}}
	defer transport.CloseIdleConnections()
	client := &http.Client{Transport: transport, Timeout: 5 * time.Second}
	req, _ := http.NewRequestWithContext(ctx, "GET", "http://docker/containers/json?all=true", nil)
	res, err := client.Do(req)
	if err != nil {
		result.Error = "Docker is unavailable"
		return result
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		result.Error = fmt.Sprintf("Docker returned HTTP %d", res.StatusCode)
		return result
	}
	var rows []struct {
		ID     string `json:"Id"`
		Names  []string
		Image  string
		State  string
		Status string
		Labels map[string]string
	}
	if json.NewDecoder(res.Body).Decode(&rows) != nil {
		result.Error = "Invalid Docker response"
		return result
	}
	result.Status = "available"
	result.Containers = make([]Container, 0, len(rows))
	for _, row := range rows {
		name := row.ID
		if len(row.Names) > 0 {
			name = strings.TrimPrefix(row.Names[0], "/")
		}
		health := "none"
		for _, value := range []string{"unhealthy", "healthy", "starting"} {
			if strings.Contains(row.Status, "("+value+")") || strings.Contains(row.Status, "(health: "+value+")") {
				health = value
				break
			}
		}
		service := row.Labels["com.docker.swarm.service.name"]
		slot := ""
		if service != "" && strings.HasPrefix(name, service+".") {
			candidate := strings.Split(strings.TrimPrefix(name, service+"."), ".")[0]
			if number, err := strconv.Atoi(candidate); err == nil && number > 0 {
				slot = candidate
			}
		}
		result.Containers = append(result.Containers, Container{ID: row.ID, Name: name, Image: row.Image, State: row.State, Health: health, Service: service, Slot: slot})
	}
	return result
}
func Tunnel(ctx context.Context, endpoint string) Source {
	result := Source{Status: "unknown", CheckedAt: time.Now().UTC()}
	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		result.Error = "Invalid tunnel endpoint"
		return result
	}
	res, err := (&http.Client{Timeout: 5 * time.Second}).Do(req)
	if err != nil {
		result.Error = "Tunnel connector is unavailable"
		return result
	}
	defer res.Body.Close()
	var body struct {
		ReadyConnections *int `json:"readyConnections"`
	}
	if res.StatusCode == 503 {
		result.Status = "disconnected"
		return result
	}
	if res.StatusCode != 200 {
		result.Error = fmt.Sprintf("Tunnel returned HTTP %d", res.StatusCode)
		return result
	}
	if json.NewDecoder(res.Body).Decode(&body) != nil || body.ReadyConnections == nil || *body.ReadyConnections < 0 {
		result.Error = "Invalid tunnel response"
		return result
	}
	result.Connections = *body.ReadyConnections
	result.Status = "disconnected"
	if *body.ReadyConnections > 0 {
		result.Status = "connected"
	}
	return result
}
