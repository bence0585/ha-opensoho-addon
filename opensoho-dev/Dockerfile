# Az OpenSOHO fork (bence0585/opensoho) forrásból buildelve, tesztelésre.
# A commit rögzítve van, így a build mindig ugyanazt a kódot adja.
ARG OPENSOHO_REPO=https://github.com/bence0585/opensoho.git
ARG OPENSOHO_REF=da9c53c7980688ff561b89940a76a23a1233d036

FROM golang:1.27-alpine AS build
ARG OPENSOHO_REPO
ARG OPENSOHO_REF
RUN apk add --no-cache git ca-certificates
RUN git clone "$OPENSOHO_REPO" /src && git -C /src checkout --detach "$OPENSOHO_REF"
WORKDIR /src
RUN go mod download
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o /opensoho .

FROM alpine:3.22
RUN apk add --no-cache ca-certificates jq tzdata unzip

WORKDIR /app
COPY --from=build /opensoho /app/opensoho
COPY run.sh /run.sh
RUN chmod +x /run.sh /app/opensoho

CMD ["/run.sh"]
