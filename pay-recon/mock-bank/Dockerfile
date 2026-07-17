FROM golang:1.24-alpine AS build

WORKDIR /src

COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/mock-bank .

FROM alpine:3.21 AS runtime

RUN apk add --no-cache ca-certificates tzdata wget \
 && addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY --from=build /out/mock-bank /app/mock-bank

USER app
EXPOSE 8081

HEALTHCHECK --interval=10s --timeout=3s --retries=6 \
  CMD wget -qO- http://localhost:8081/health || exit 1

ENTRYPOINT ["/app/mock-bank"]
