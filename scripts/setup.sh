#!/usr/bin/env bash
# Managed Care Platform — one-shot setup.
# Verifies prereqs, prepares .env, and builds Docker images.
# After this finishes, run:  docker compose up

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

bold()  { printf "\033[1m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1" >&2; }

bold "==> Managed Care Platform setup"

# 1. Prereqs
need() { command -v "$1" >/dev/null 2>&1 || { red "Missing: $1"; exit 1; }; }
need docker
if ! docker compose version >/dev/null 2>&1; then
  red "Missing: 'docker compose' plugin. Install Docker Desktop or the compose plugin."
  exit 1
fi
green "✓ docker + compose present"

if ! docker info >/dev/null 2>&1; then
  red "Docker daemon not running. Start Docker and re-run."
  exit 1
fi
green "✓ docker daemon running"

# 2. .env bootstrap
if [[ ! -f .env ]]; then
  cp .env.example .env
  yellow "✓ Created .env from .env.example"
else
  green "✓ .env already present (leaving as-is)"
fi

# 3. JWT secret — auto-generate if placeholder
if grep -q "change-me-to-a-32-byte-hex-string" .env; then
  SECRET="$(openssl rand -hex 32 2>/dev/null || python3 -c 'import secrets;print(secrets.token_hex(32))')"
  # macOS/BSD vs GNU sed
  if sed --version >/dev/null 2>&1; then
    sed -i "s|change-me-to-a-32-byte-hex-string|${SECRET}|" .env
  else
    sed -i '' "s|change-me-to-a-32-byte-hex-string|${SECRET}|" .env
  fi
  green "✓ Generated JWT_SECRET in .env"
fi

# 4. Gemini key — prompt interactively if missing
set_env_var() {
  # Replace KEY=... line in-place; portable across GNU and BSD sed.
  local key="$1" val="$2"
  # Escape sed delimiters in the value.
  local esc
  esc=$(printf '%s' "$val" | sed -e 's/[\/&|]/\\&/g')
  if sed --version >/dev/null 2>&1; then
    sed -i "s|^${key}=.*|${key}=${esc}|" .env
  else
    sed -i '' "s|^${key}=.*|${key}=${esc}|" .env
  fi
}

current_gemini="$(grep -E '^GEMINI_API_KEY=' .env | head -1 | cut -d'=' -f2- || true)"
if [[ -z "${current_gemini}" ]]; then
  if [[ -t 0 && -t 1 && "${CI:-}" != "true" ]]; then
    bold "==> Gemini API key"
    echo "  Get a key at: https://aistudio.google.com/apikey"
    echo "  (leave blank to skip — AI features will 500 until you add one to .env)"
    printf "  GEMINI_API_KEY: "
    read -r entered_key
    if [[ -n "${entered_key}" ]]; then
      set_env_var GEMINI_API_KEY "${entered_key}"
      green "✓ Saved GEMINI_API_KEY to .env"
    else
      yellow "⚠ Skipped. Add GEMINI_API_KEY to .env before AI features will work."
    fi
  else
    yellow "⚠ GEMINI_API_KEY is empty in .env (non-interactive shell — skipping prompt)."
    yellow "  Set it in .env or via env var before starting."
  fi
else
  green "✓ GEMINI_API_KEY already set in .env"
fi

# 5. Build images
bold "==> Building Docker images (first run can take 3–5 min)"
docker compose build

green ""
green "✅ Setup complete."
green ""
bold "Next steps:"
echo "  1. Start the stack:   docker compose up"
echo "  2. Open the app:      http://localhost:3000"
echo "  3. API docs:          http://localhost:8000/docs"
