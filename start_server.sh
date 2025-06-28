#!/usr/bin/env bash
# start_server.sh — must be sourced, not executed

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "Error: this script must be sourced!"
  echo "  source $0"
  return 1 2>/dev/null || exit 1
fi

mkdir -p ./logs/run/pids

# Django dev server
nohup python ./backend/django/manage.py runserver \
  > ./logs/django.log 2>&1 \
  </dev/null &
echo $! > ./logs/run/pids/django.pid
echo "Django started (PID $(<./logs/run/pids/django.pid)), logs → logs/django.log"
echo "Default Port: http://localhost:8000"

# Payments API
nohup npm --prefix ./backend/open-payments-express run dev \
  > ./logs/payments.log 2>&1 \
  </dev/null &
echo $! > ./logs/run/pids/payments.pid
echo "Payments API started (PID $(<./logs/run/pids/payments.pid)), logs → logs/payments.log"
echo "Default Port: http://localhost:3001"

# Front end
nohup npm --prefix ./frontend/canva-clone run dev \
  > ./logs/canva-clone.log 2>&1 \
  </dev/null &
echo $! > ./logs/run/pids/canva-clone.pid
echo "Front end started (PID $(<./logs/run/pids/canva-clone.pid)), logs → logs/canva-clone.log"
echo "Default Port: http://localhost:3000"
