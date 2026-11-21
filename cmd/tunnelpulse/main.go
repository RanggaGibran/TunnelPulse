package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"
	"tunnelpulse/internal/monitor"
)

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	var mu sync.RWMutex
	var collection sync.Mutex
	snapshot := monitor.Snapshot{Docker: monitor.Source{Status: "unknown"}, Tunnel: monitor.Source{Status: "unknown"}}
	collect := func() {
		if !collection.TryLock() {
			return
		}
		defer collection.Unlock()
		var next monitor.Snapshot
		var wg sync.WaitGroup
		wg.Add(2)
		go func() {
			defer wg.Done()
			next.Docker = monitor.Docker(ctx, env("DOCKER_SOCKET", "/var/run/docker.sock"))
		}()
		go func() {
			defer wg.Done()
			next.Tunnel = monitor.Tunnel(ctx, env("TUNNEL_READY_URL", "http://127.0.0.1:20241/ready"))
		}()
		wg.Wait()
		mu.Lock()
		snapshot = next
		mu.Unlock()
	}
	go func() {
		collect()
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				collect()
			}
		}
	}()
	mux := http.NewServeMux()
	status := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		mu.RLock()
		defer mu.RUnlock()
		json.NewEncoder(w).Encode(snapshot)
	}
	mux.HandleFunc("GET /api/status", status)
	mux.HandleFunc("POST /api/refresh", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-TunnelPulse-Refresh") != "1" {
			http.Error(w, "Missing refresh header", http.StatusForbidden)
			return
		}
		collect()
		status(w, r)
	})
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("ok")) })
	mux.Handle("GET /", http.FileServer(http.Dir(env("WEB_DIR", "web/dist"))))
	server := &http.Server{Addr: env("LISTEN_ADDR", "127.0.0.1:8088"), Handler: mux, ReadHeaderTimeout: 5 * time.Second, WriteTimeout: 10 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		server.Shutdown(shutdown)
	}()
	log.Printf("Listening on %s", server.Addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
