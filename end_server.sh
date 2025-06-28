#!/usr/bin/env bash
# stop-all.sh — must be sourced

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "Error: please source this script:"
  echo "  source $0"
  return 1 2>/dev/null || exit 1
fi

for f in ./logs/run/pids/*.pid; do
  [[ -f $f ]] || continue
  pid=$(<"$f")
  name=$(basename "$f" .pid)
  if kill -0 "$pid" 2>/dev/null; then
    echo "Stopping $name (PID $pid)…"

    # 1) gentle TERM
    kill -TERM "$pid"
    for i in {1..10}; do
      sleep 0.2
      kill -0 "$pid" 2>/dev/null || break
    done

    # 2) escalate to INT if still alive
    if kill -0 "$pid" 2>/dev/null; then
      echo "→ $name did not exit on TERM, sending SIGINT"
      kill -INT "$pid"
      for i in {1..10}; do
        sleep 0.2
        kill -0 "$pid" 2>/dev/null || break
      done
    fi

    # 3) force-kill if still alive
    if kill -0 "$pid" 2>/dev/null; then
      echo "→ $name still running, sending SIGKILL"
      kill -KILL "$pid"
    fi

    # wait once more for clean-up
    while kill -0 "$pid" 2>/dev/null; do
      sleep 0.1
    done

    echo "→ $name (PID $pid) has exited."
  else
    echo "No process $pid for $name — maybe already stopped."
  fi

  rm -f "$f"
done
