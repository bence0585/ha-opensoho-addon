# A hivatalos OpenSOHO image-ből csak a (statikus) binárist vesszük át,
# mert az minimális, shell nélküli image.
FROM ghcr.io/opensoho/opensoho:latest AS src

FROM alpine:3.22
RUN apk add --no-cache ca-certificates jq tzdata

WORKDIR /app
COPY --from=src /ko-app/opensoho /app/opensoho
COPY run.sh /run.sh
RUN chmod +x /run.sh /app/opensoho

CMD ["/run.sh"]
