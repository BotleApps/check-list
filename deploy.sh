#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

APP_NAME="checklist-app"
DEFAULT_CF_API="https://api.cf.eu12.hana.ondemand.com"
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
DEFAULT_MTAR="${APP_NAME}_${TIMESTAMP}.mtar"

CLEAN_BUILD=false
SKIP_WEB_BUILD=false
FORCE_MANIFEST_DEPLOY=false
MTAR_NAME="${MTAR_NAME:-$DEFAULT_MTAR}"
CF_API="${CF_API:-$DEFAULT_CF_API}"
CF_ORG="${CF_ORG:-}" 
CF_SPACE="${CF_SPACE:-}"
CF_USERNAME="${CF_USERNAME:-}"
CF_PASSWORD="${CF_PASSWORD:-}"

usage() {
    cat <<'EOF'
Checklist App - SAP BTP Deployment

Usage: ./deploy.sh [options]

Options:
    --clean             Remove previous dist/approuter build artifacts before building
    --skip-web-build    Skip npm install + Expo web build (assumes ./dist already exists)
    --mtar <name>       Override the generated MTAR filename (default: checklist-app_<timestamp>.mtar)
    --manifest          Force fallback deployment via cf push/manifest (skip mbt)
    --cf-api <url>      Cloud Foundry API endpoint (default: https://api.cf.eu12.hana.ondemand.com)
    --cf-org <org>      Cloud Foundry org (used for auto-login when credentials provided)
    --cf-space <space>  Cloud Foundry space (used for auto-login when credentials provided)
    --cf-user <user>    Cloud Foundry username for non-interactive login (requires --cf-pass)
    --cf-pass <pass>    Cloud Foundry password/token for non-interactive login
    -h, --help          Show this help message

Environment variables:
    CF_API, CF_ORG, CF_SPACE, CF_USERNAME, CF_PASSWORD, MTAR_NAME can be used instead of flags.
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --clean) CLEAN_BUILD=true ;;
        --skip-web-build) SKIP_WEB_BUILD=true ;;
        --manifest) FORCE_MANIFEST_DEPLOY=true ;;
        --mtar) MTAR_NAME="$2"; shift ;;
        --cf-api) CF_API="$2"; shift ;;
        --cf-org) CF_ORG="$2"; shift ;;
        --cf-space) CF_SPACE="$2"; shift ;;
        --cf-user) CF_USERNAME="$2"; shift ;;
        --cf-pass) CF_PASSWORD="$2"; shift ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Unknown option: $1"; usage; exit 1 ;;
    esac
    shift
done

log() {
    printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

fail() {
    log "❌ $1"
    exit 1
}

ensure_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        fail "Required command '$1' not found in PATH"
    fi
}

auto_cf_login() {
    if cf target >/dev/null 2>&1; then
        return
    fi

    if [[ -n "$CF_USERNAME" && -n "$CF_PASSWORD" && -n "$CF_ORG" && -n "$CF_SPACE" ]]; then
        log "🔐 Logging in to Cloud Foundry via provided credentials..."
        cf login -a "$CF_API" -u "$CF_USERNAME" -p "$CF_PASSWORD" -o "$CF_ORG" -s "$CF_SPACE"
    else
        fail "Not logged in to Cloud Foundry. Run 'cf login' or provide --cf-* credentials."
    fi
}

ensure_command cf
ensure_command npm

USE_MBT=true
if $FORCE_MANIFEST_DEPLOY; then
    USE_MBT=false
else
    if command -v mbt >/dev/null 2>&1; then
        USE_MBT=true
    else
        log "⚠️  Cloud MTA Build Tool not found; falling back to manifest-based cf push"
        USE_MBT=false
    fi
fi

auto_cf_login

if $CLEAN_BUILD; then
    log "🧹 Cleaning previous build artifacts"
    rm -rf dist approuter/resources
fi

if ! $SKIP_WEB_BUILD; then
    log "📦 Installing root dependencies"
    npm install --legacy-peer-deps

    log "🔨 Building Expo web bundle"
    EXPO_NO_TELEMETRY=1 npm run build:web
fi

[[ -d dist ]] || fail "Web build missing. Re-run without --skip-web-build."

if $USE_MBT; then
    ensure_command mbt

    log "📦 Building MTAR ($MTAR_NAME)"
    mbt build -p=cf -t mta_archives --mtar "$MTAR_NAME"

    MTAR_PATH="mta_archives/$MTAR_NAME"
    [[ -f "$MTAR_PATH" ]] || fail "MTAR not found at $MTAR_PATH"

    log "🌐 Deploying MTAR via cf deploy"
    cf deploy "$MTAR_PATH"
else
    log "🚀 Deploying via cf push (manifest.yml)"
    cf push -f manifest.yml
fi

log "🎉 Deployment complete!"
cf apps | grep "$APP_NAME" || true
