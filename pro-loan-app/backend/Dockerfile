FROM golang:1.24-alpine AS build

WORKDIR /src

COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/api .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/worker ./cmd/worker
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/seed ./cmd/seed

FROM alpine:3.21 AS runtime

RUN apk add --no-cache ca-certificates tzdata wget \
 && addgroup -S app && adduser -S app -G app

WORKDIR /app

COPY --from=build /out/api    /app/api
COPY --from=build /out/worker /app/worker
COPY --from=build /out/seed   /app/seed

USER app
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --retries=6 \
  CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["/app/api"]
