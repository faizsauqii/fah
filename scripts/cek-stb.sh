#!/bin/sh
# Info lingkungan STB untuk README (bagian lingkungan deploy).
echo "== Arsitektur ==";   uname -m
echo "== OS ==";           (cat /etc/os-release 2>/dev/null | grep PRETTY_NAME) || uname -a
echo "== Memori ==";       free -h
echo "== Disk ==";         df -h /
echo "== Docker ==";       docker --version 2>/dev/null || echo "Docker belum terpasang"
docker compose version 2>/dev/null || echo "Plugin docker compose belum terpasang"
echo "== Open-Meteo ==";
curl -s -o /dev/null -w "Air Quality API: %{http_code}\n" -A "JamHijau-cek/1.0" "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=-6.89&longitude=107.61&hourly=pm2_5&forecast_days=1"
curl -s -o /dev/null -w "Forecast API: %{http_code}\n" -A "JamHijau-cek/1.0" "https://api.open-meteo.com/v1/forecast?latitude=-6.89&longitude=107.61&hourly=temperature_2m&forecast_days=1"
