# GrubDrops v2.3.2 + kis javitas (mine-all.patch): GRUB_MINE_ALL=1 mellett a
# kivalasztott jatekok utan az osszes tobbi aktiv, mar linkelt kampanyt is banyassza.
FROM alpine/git AS src
WORKDIR /src
RUN git clone --depth 1 --branch v2.3.2 https://github.com/grubdrops/grubdrops.git .
COPY mine-all.patch /tmp/mine-all.patch
RUN git apply /tmp/mine-all.patch

FROM node:25-alpine AS web
WORKDIR /src/web
COPY --from=src /src/web/package.json /src/web/package-lock.json ./
RUN npm ci
COPY --from=src /src/web/ ./
COPY --from=src /src/internal/i18n/locales/ /src/internal/i18n/locales/
COPY --from=src /src/assets/img/ /src/assets/img/
RUN npm run build

FROM golang:1.26-alpine AS build
WORKDIR /src
RUN apk add --no-cache git ca-certificates
COPY --from=src /src/go.mod /src/go.sum ./
RUN go mod download
COPY --from=src /src/ ./
COPY --from=web /src/internal/web/dist ./internal/web/dist
RUN CGO_ENABLED=0 go build -ldflags="-s -w -X main.version=v2.3.2-mineall" -o /out/grubdrops ./cmd/miner

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/grubdrops /grubdrops
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
# A HA /data mappaja root-e, ezert root-kent fut.
USER root
ENV GRUB_SECURE_COOKIES=0 \
    GRUB_DB_PATH=/data/miner.db \
    GRUB_MINE_ALL=1 \
    TZ=Europe/Budapest
EXPOSE 8080
ENTRYPOINT ["/grubdrops"]
