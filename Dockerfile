FROM node:22-alpine AS frontend
WORKDIR /web
COPY web/package*.json ./
RUN npm ci --ignore-scripts
COPY web/ ./
RUN npm run build

FROM golang:1.24-alpine AS backend
WORKDIR /app
COPY go.mod ./
COPY cmd/ cmd/
COPY internal/ internal/
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tunnelpulse ./cmd/tunnelpulse

FROM alpine:3.22
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=backend /tunnelpulse /usr/local/bin/tunnelpulse
COPY --from=frontend /web/dist ./web/dist
EXPOSE 8088
ENTRYPOINT ["tunnelpulse"]
