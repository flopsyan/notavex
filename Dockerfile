# syntax=docker/dockerfile:1

# ---- build stage ----
# No --platform / TARGET* build args, so this works with the classic Docker
# builder too (buildx is not required). To produce a multi-arch image, build
# with buildx, which runs this stage per target platform:
#   docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7 .
FROM golang:1.22-alpine AS build
WORKDIR /src

# No external modules, so this is effectively a no-op — but it keeps the layer
# cached and makes the intent clear.
COPY go.mod ./
RUN go mod download

COPY . .

# Build a static, dependency-free binary for the build platform.
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /notavex .

# ---- runtime stage ----
FROM gcr.io/distroless/static-debian12:latest

COPY --from=build /notavex /notavex

ENV NOTAVEX_ADDR=":8080" \
    NOTAVEX_DATA_DIR="/data"

EXPOSE 8080
VOLUME ["/data"]

ENTRYPOINT ["/notavex"]
