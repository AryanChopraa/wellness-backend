#!/usr/bin/env bash
# Test GCS asset upload. Usage: ./scripts/test-asset-upload.sh [email] [path-to-file]
# Default: email = test@example.com, file = a small temp file.
# Requires: backend running (npm run dev), and a user for the email (sign up first if needed).

set -e
BASE="${BASE_URL:-http://localhost:4000}"
EMAIL="${1:-test@example.com}"
FILE="${2:-}"

if [ -z "$FILE" ]; then
  FILE=$(mktemp)
  echo "test file at $(date)" > "$FILE"
  echo "Using temp file: $FILE"
fi

if [ ! -f "$FILE" ]; then
  echo "File not found: $FILE"
  exit 1
fi

echo "1. Requesting OTP for $EMAIL..."
curl -s -X POST "$BASE/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}" > /dev/null

echo "2. Getting OTP (dev only)..."
ENCODED_EMAIL=$(node -e "console.log(encodeURIComponent('$EMAIL'))")
CODE=$(curl -s "$BASE/auth/otp/dev/$ENCODED_EMAIL" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(j.code||'')}catch(e){}})")
if [ -z "$CODE" ]; then
  echo "Could not get OTP. Is NODE_ENV not production and server running? Try GET $BASE/auth/otp/dev/$ENCODED_EMAIL"
  exit 1
fi

echo "3. Exchanging OTP for token..."
RESP=$(curl -s -X POST "$BASE/auth/otp/verify" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"code\":\"$CODE\"}")
TOKEN=$(echo "$RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(j.token||'')}catch(e){}})")
if [ -z "$TOKEN" ]; then
  echo "No token in response: $RESP"
  exit 1
fi

echo "4. Uploading file to POST /assets..."
UPLOAD=$(curl -s -w "\n%{http_code}" -X POST "$BASE/assets" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$FILE")

HTTP_CODE=$(echo "$UPLOAD" | tail -n1)
BODY=$(echo "$UPLOAD" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
  echo "Success. Response:"
  echo "$BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.stringify(JSON.parse(d),null,2))}catch(e){console.log(d)}})"
  echo ""
  ASSET_URL=$(echo "$BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(j.asset&&j.asset.url||'')}catch(e){}})")
  echo "Asset URL: $ASSET_URL"
else
  echo "Upload failed (HTTP $HTTP_CODE): $BODY"
  exit 1
fi
