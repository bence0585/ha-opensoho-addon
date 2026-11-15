FROM justarchi/archisteamfarm:latest

USER root
RUN apt-get update && apt-get install -y --no-install-recommends jq && rm -rf /var/lib/apt/lists/*
COPY run.sh /ha-run.sh
RUN chmod +x /ha-run.sh

ENTRYPOINT ["/ha-run.sh"]
