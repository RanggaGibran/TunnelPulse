package monitor

import (
 "context"
 "encoding/json"
 "fmt"
 "net/http"
 "net/url"
 "os"
 "sync"
 "time"
)

type ServiceConfig struct {
 ID string `json:"id"`
 Name string `json:"name"`
 OriginURL string `json:"originUrl"`
 PublicURL string `json:"publicUrl,omitempty"`
 Container string `json:"container,omitempty"`
}
type Check struct {
 Status string `json:"status"`
 LatencyMS int64 `json:"latencyMs"`
 StatusCode int `json:"statusCode,omitempty"`
 Error string `json:"error,omitempty"`
}
type Sample struct {
 At time.Time `json:"at"`
 Status string `json:"status"`
 LatencyMS int64 `json:"latencyMs"`
}
type Service struct {
 ServiceConfig
 Status string `json:"status"`
 Diagnosis string `json:"diagnosis"`
 CheckedAt time.Time `json:"checkedAt"`
 Origin Check `json:"origin"`
 Public Check `json:"public"`
 ContainerState string `json:"containerState"`
 TunnelStatus string `json:"tunnelStatus"`
 History []Sample `json:"history"`
}
type Incident struct {
 ID string `json:"id"`
 ServiceID string `json:"serviceId"`
 ServiceName string `json:"serviceName"`
 OpenedAt time.Time `json:"openedAt"`
 ResolvedAt *time.Time `json:"resolvedAt,omitempty"`
 Summary string `json:"summary"`
}

func LoadServices(path string) ([]ServiceConfig,error) {
 if path=="" {return []ServiceConfig{},nil}
 contents,err:=os.ReadFile(path);if err!=nil{return nil,err}
 var configs []ServiceConfig
 if err=json.Unmarshal(contents,&configs);err!=nil{return nil,err}
 if len(configs)>32{return nil,fmt.Errorf("at most 32 services are supported")}
 ids:=map[string]bool{}
 for _,c:=range configs {
 if c.ID=="" || c.Name=="" || ids[c.ID] {return nil,fmt.Errorf("service IDs and names must be present and IDs unique")};ids[c.ID]=true
 for _,raw:=range []string{c.OriginURL,c.PublicURL} {
 if raw=="" {continue};u,err:=url.Parse(raw)
 if err!=nil || (u.Scheme!="http" && u.Scheme!="https") || u.Host=="" || u.User!=nil || u.RawQuery!="" || u.Fragment!="" {return nil,fmt.Errorf("service %s requires HTTP URLs without credentials, query strings or fragments",c.ID)}
 }
 if c.OriginURL=="" {return nil,fmt.Errorf("service %s requires an origin URL",c.ID)}
 }
 return configs,nil
}

func Probe(ctx context.Context, endpoint string) Check {
 if endpoint=="" {return Check{Status:"not_configured"}}
 start:=time.Now()
 request,err:=http.NewRequestWithContext(ctx,http.MethodGet,endpoint,nil)
 if err!=nil{return Check{Status:"unknown",Error:"Invalid check URL"}}
 request.Header.Set("User-Agent","TunnelPulse/0.2")
 client:=&http.Client{Timeout:3*time.Second,CheckRedirect:func(_ *http.Request,_ []*http.Request)error{return http.ErrUseLastResponse}}
 response,err:=client.Do(request)
 result:=Check{Status:"down",LatencyMS:time.Since(start).Milliseconds()}
 if err!=nil {result.Error="Request failed or timed out";return result}
 response.Body.Close();result.StatusCode=response.StatusCode
 if response.StatusCode>=200 && response.StatusCode<300 {result.Status="healthy"} else {result.Error=fmt.Sprintf("HTTP %d; expected 2xx",response.StatusCode)}
 return result
}

func CheckServices(ctx context.Context,configs []ServiceConfig,docker,tunnel Source) []Service {
 results:=make([]Service,len(configs));var wg sync.WaitGroup
 for i,config:=range configs {wg.Add(1);go func(i int,c ServiceConfig){defer wg.Done()
 service:=Service{ServiceConfig:c,CheckedAt:time.Now().UTC(),ContainerState:"not_configured",TunnelStatus:tunnel.Status,History:[]Sample{}}
 var probes sync.WaitGroup;probes.Add(2)
 go func(){defer probes.Done();service.Origin=Probe(ctx,c.OriginURL)}()
 go func(){defer probes.Done();service.Public=Probe(ctx,c.PublicURL)}()
 probes.Wait()
 if c.Container!="" {service.ContainerState="missing";if docker.Status!="available" {service.ContainerState="unknown"} else {
 for _,container:=range docker.Containers {if container.Name==c.Container || container.Service==c.Container {if service.ContainerState=="missing" || (container.State=="running" && service.ContainerState!="unhealthy") {service.ContainerState=container.State;if container.State=="running" && container.Health=="unhealthy" {service.ContainerState="unhealthy"}}}}
 }}
 service.Status,service.Diagnosis=Diagnose(service)
 results[i]=service
 }(i,config)}
 wg.Wait();return results
}

func Diagnose(s Service)(string,string){
 if s.Origin.Status=="down" {
 if s.ContainerState=="exited" || s.ContainerState=="dead" || s.ContainerState=="missing" {return "down","Origin check failed and the mapped container is not running. Check the workload first."}
 if s.ContainerState=="running" {return "down","Container is running, but the origin check failed. Check the application listener, port and routing."}
 return "down","Origin check failed. Inspect the application and the configured origin address."
 }
 if s.Origin.Status!="healthy" {return "unknown","Origin health could not be established."}
 if s.Public.Status=="down" {return "degraded","Origin responds, but the public endpoint check failed. Check DNS, tunnel routing and access policies."}
 if s.PublicURL!="" && s.Public.Status!="healthy" {return "unknown","Origin responds, but public endpoint health could not be established."}
 if s.ContainerState=="unhealthy" {return "degraded","HTTP responds, but Docker reports an unhealthy container. Inspect its health check."}
 if s.Container!="" && s.ContainerState!="running" {return "degraded","Origin responds, but the mapped container state could not confirm a running workload."}
 if s.PublicURL!="" && s.TunnelStatus!="connected" {return "degraded","HTTP checks respond, but the local connector is not confirmed connected. This endpoint may use another connector."}
 if s.PublicURL=="" {return "healthy","Origin responds. No public endpoint is configured; external reachability is not checked."}
 return "healthy","Origin and public endpoint respond successfully. No failure detected in the configured checks."
}

type History struct { services map[string][]Sample; incidents []Incident }
func NewHistory()*History{return &History{services:map[string][]Sample{},incidents:[]Incident{}}}
func (h *History) Record(services []Service) []Incident {
 for i:=range services {
 s:=&services[i];history:=append(h.services[s.ID],Sample{At:s.CheckedAt,Status:s.Status,LatencyMS:s.Origin.LatencyMS})
 if len(history)>120 {history=history[len(history)-120:]};h.services[s.ID]=history;s.History=append([]Sample{},history...)
 open:=-1;for j:=range h.incidents {if h.incidents[j].ServiceID==s.ID && h.incidents[j].ResolvedAt==nil {open=j;break}}
 failing:=s.Status=="down" || s.Status=="degraded"
 if failing && open<0 {h.incidents=append(h.incidents,Incident{ID:fmt.Sprintf("%s-%d",s.ID,s.CheckedAt.UnixNano()),ServiceID:s.ID,ServiceName:s.Name,OpenedAt:s.CheckedAt,Summary:s.Diagnosis})}
 if s.Status=="healthy" && open>=0 {at:=s.CheckedAt;h.incidents[open].ResolvedAt=&at}
 }
 // Retain active incidents before trimming resolved history.
 if len(h.incidents)>200 {for i:=0;i<len(h.incidents) && len(h.incidents)>200; {if h.incidents[i].ResolvedAt!=nil {h.incidents=append(h.incidents[:i],h.incidents[i+1:]...)} else {i++}}}
 return append([]Incident{},h.incidents...)
}
