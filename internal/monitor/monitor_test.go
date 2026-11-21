package monitor

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
)

func TestTunnel(t *testing.T) {
	for _, tc := range []struct {
		name, body, want string
		code             int
	}{{"connected", `{"readyConnections":4}`, "connected", 200}, {"no connections", `{"readyConnections":0}`, "disconnected", 200}, {"not ready", `{}`, "disconnected", 503}, {"invalid JSON", `oops`, "unknown", 200}, {"missing field", `{}`, "unknown", 200},
 {"negative count", `{"readyConnections":-1}`, "unknown", 200},
 {"server error", `{}`, "unknown", 500}} {
		t.Run(tc.name, func(t *testing.T) {
			s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(tc.code); w.Write([]byte(tc.body)) }))
			defer s.Close()
			got := Tunnel(context.Background(), s.URL)
			if got.Status != tc.want {
				t.Fatalf("got %s, want %s", got.Status, tc.want)
			}
		})
	}
}
func TestDocker(t *testing.T) {
	socket := filepath.Join(t.TempDir(), "docker.sock")
	listener, err := net.Listen("unix", socket)
	if err != nil {
		t.Fatal(err)
	}
	server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/containers/json" || r.URL.Query().Get("all") != "true" {
			t.Errorf("unexpected request %s", r.URL)
		}
		w.Write([]byte(`[{"Id":"abc","Names":["/api.1.task"],"Image":"api:1","State":"running","Status":"Up 1 hour (unhealthy)","Labels":{"com.docker.swarm.service.name":"api"}}]`))
	})}
	go server.Serve(listener)
	defer server.Close()
	result := Docker(context.Background(), socket)
	if result.Status != "available" || len(result.Containers) != 1 {
		t.Fatalf("unexpected result: %+v", result)
	}
	c := result.Containers[0]
	if c.State != "running" || c.Health != "unhealthy" || c.Service != "api" {
		t.Fatalf("unexpected container: %+v", c)
	}
}
func TestDockerUnavailable(t *testing.T) {
	if got := Docker(context.Background(), "/missing/docker.sock"); got.Status != "unknown" || got.Error == "" {
		t.Fatalf("unexpected result: %+v", got)
	}
}
