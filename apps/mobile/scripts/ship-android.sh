#!/bin/bash
set -e

# Load Firebase env vars from .env so they get baked into the build
if [ -f .env ]; then
  set -a && source .env && set +a
else
  echo "Error: apps/mobile/.env not found. Copy .env.example and fill in your Firebase values."
  exit 1
fi

# Old builds and caches pile up quickly; clear them and check there's room
source "$(dirname "$0")/free-space.sh"
free_space 8

KEY=play-service-account.json
if [ ! -f "$KEY" ]; then
  cat <<MSG
Error: $KEY not found.

It is the Google service account key with Play release permissions. The same
key can serve FCM push and Play submissions. Get one from
Firebase Console -> Project settings -> Service accounts -> Generate new private key,
save it here as $KEY, and make sure that account is invited in
Play Console -> Users and permissions with release and testing-track access.
MSG
  exit 1
fi

PACKAGE=$(node -p "require('./app.json').expo.android.package")

echo "▶ Building $PACKAGE…"
eas build --platform android --profile preview --local

# Find the bundle that was just produced
AAB=$(ls -t build-*.aab 2>/dev/null | head -1)
if [ -z "$AAB" ]; then
  echo "Error: no .aab file found after build."
  exit 1
fi

# Uploaded straight to Play with fastlane rather than EAS Submit, whose
# free-tier queue can take hours. Metadata and screenshots are managed in the
# Play Console, so nothing but the binary is touched here.
# RELEASE_STATUS=draft uploads without handing it to testers yet: for a build
# that needs a server change first, such as a new data version.
STATUS=${RELEASE_STATUS:-completed}
echo "▶ Uploading $AAB to the internal testing track ($STATUS)…"
fastlane supply \
  --aab "$AAB" \
  --json_key "$KEY" \
  --package_name "$PACKAGE" \
  --track internal \
  --release_status "$STATUS" \
  --skip_upload_metadata \
  --skip_upload_images \
  --skip_upload_screenshots \
  --skip_upload_changelogs

echo "✓ Done. Check Play Console → Testing → Internal testing."
