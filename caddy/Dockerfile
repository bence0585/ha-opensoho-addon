FROM caddy:2.10-builder AS builder
RUN xcaddy build --with github.com/caddy-dns/cloudflare

FROM caddy:2.10
RUN apk add --no-cache jq
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
COPY run.sh /run.sh
RUN chmod +x /run.sh
ENTRYPOINT []
CMD ["/run.sh"]
