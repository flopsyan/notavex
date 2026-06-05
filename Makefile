.PHONY: run build test vet fmt docker clean

run: ; go run .
build: ; CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o jot .
test: ; go test ./...
vet: ; go vet ./...
fmt: ; gofmt -w .
docker: ; docker compose up --build
clean: ; rm -f jot
