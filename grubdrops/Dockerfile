# GrubDrops (Twitch + Kick drops miner, több fiók egy példányban).
# Az upstream kép distroless és nonroot; a HA /data mappájához root kell.
FROM ghcr.io/grubdrops/grubdrops:v2.3.2

USER root
ENV GRUB_SECURE_COOKIES=0 \
    GRUB_DB_PATH=/data/miner.db \
    TZ=Europe/Budapest
