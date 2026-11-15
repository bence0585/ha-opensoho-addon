FROM justarchi/archisteamfarm:latest

USER root
COPY run.sh /ha-run.sh
RUN chmod +x /ha-run.sh

ENTRYPOINT ["/ha-run.sh"]
