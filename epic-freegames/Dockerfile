FROM ghcr.io/claabs/epicgames-freegames-node:latest

COPY run.sh /ha-run.sh
RUN chmod +x /ha-run.sh

ENTRYPOINT ["tini", "-s", "--", "/ha-run.sh"]
