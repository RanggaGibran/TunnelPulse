package monitor

import (
 "context"
 "net/http"
 "net/http/httptest"
 "os"
 "path/filepath"
 "testing"
 "time"
)
func TestProbe(t *testing.T){
 for _,code:=range []int{200,204,302,401,500} {t.Run(http.StatusText(code),func(t *testing.T){server:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){w.WriteHeader(code)}));defer server.Close();got:=Probe(context.Background(),server.URL);want:="down";if code<300 {want="healthy"};if got.Status!=want || got.StatusCode!=code {t.Fatalf("unexpected check: %+v",got)}})}
}
func TestDiagnosis(t *testing.T){
 s:=Service{ServiceConfig:ServiceConfig{PublicURL:"https://example.com"},Origin:Check{Status:"down"},ContainerState:"running",TunnelStatus:"connected"}
 if status,_:=Diagnose(s);status!="down" {t.Fatal(status)}
 s.Origin.Status="healthy";s.Public.Status="down"
 if status,_:=Diagnose(s);status!="degraded" {t.Fatal(status)}
 s.Public.Status="unknown"
 if status,_:=Diagnose(s);status!="unknown" {t.Fatal(status)}
 s.Public.Status="healthy"
 if status,_:=Diagnose(s);status!="healthy" {t.Fatal(status)}
}
func TestIncidentLifecycle(t *testing.T){
 h:=NewHistory();services:=[]Service{{ServiceConfig:ServiceConfig{ID:"api",Name:"API"},Status:"down",CheckedAt:time.Now()}}
 incidents:=h.Record(services);if len(incidents)!=1 || incidents[0].ResolvedAt!=nil {t.Fatal(incidents)}
 if len(h.Record(services))!=1 {t.Fatal("duplicate incident")}
 services[0].Status="unknown";if h.Record(services)[0].ResolvedAt!=nil {t.Fatal("unknown resolved incident")}
 services[0].Status="healthy";if h.Record(services)[0].ResolvedAt==nil {t.Fatal("recovery missing")}
 for i:=0;i<150;i++ {h.Record(services)};if len(services[0].History)!=120 {t.Fatal("unbounded history")}
}
func TestServiceConfigValidation(t *testing.T){
 for _,body:=range []string{`[{"id":"a","name":"A","originUrl":"file:///etc/passwd"}]`,`[{"id":"a","name":"A","originUrl":"http://user:secret@localhost"}]`,`[{"id":"a","name":"A","originUrl":"http://localhost?token=secret"}]`} {path:=filepath.Join(t.TempDir(),"services.json");os.WriteFile(path,[]byte(body),0600);if _,err:=LoadServices(path);err==nil {t.Fatal("invalid config accepted")}}
}
func TestServiceSourceIsolation(t *testing.T){
 server:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){w.WriteHeader(200)}));defer server.Close()
 services:=CheckServices(context.Background(),[]ServiceConfig{{ID:"api",Name:"API",OriginURL:server.URL,Container:"api"}},Source{Status:"unknown"},Source{Status:"unknown"})
 if services[0].Origin.Status!="healthy" || services[0].ContainerState!="unknown" || services[0].Status!="degraded" {t.Fatal(services)}
}

func TestReplicaAggregation(t *testing.T) {
 server:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){w.WriteHeader(200)}));defer server.Close()
 for _,containers:=range [][]Container{
 {{Name:"a",Service:"api",State:"running",Health:"healthy"},{Name:"b",Service:"api",State:"running",Health:"unhealthy"}},
 {{Name:"b",Service:"api",State:"running",Health:"unhealthy"},{Name:"a",Service:"api",State:"running",Health:"healthy"}},
 } {
 result:=CheckServices(context.Background(),[]ServiceConfig{{ID:"api",Name:"API",OriginURL:server.URL,Container:"api"}},Source{Status:"available",Containers:containers},Source{Status:"connected"})
 if result[0].ContainerState!="unhealthy" || result[0].Status!="degraded" {t.Fatal(result)}
 }
}
