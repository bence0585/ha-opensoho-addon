# Zipline from the upstream image (version pinned), plus a private
# PostgreSQL in the same container so no extra add-on is needed.
FROM ghcr.io/diced/zipline:4.8.2

RUN apk add --no-cache postgresql18 postgresql18-client su-exec tini

COPY run.sh /run.sh
RUN chmod +x /run.sh

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/run.sh"]
