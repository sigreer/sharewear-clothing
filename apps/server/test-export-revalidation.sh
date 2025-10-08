#!/bin/bash

# Re-validation Test Script for Product Export Fix
# Tests all critical scenarios to verify fixes are working

set -e

BASE_URL="http://sharewear.local:9000"
ADMIN_EMAIL="qatest@admin.com"
ADMIN_PASSWORD="testpass123"

echo "=========================================="
echo "Product Export Re-Validation Tests"
echo "=========================================="
echo ""

# Get authentication token
echo "Test 0: Authenticating..."
TOKEN=$(curl -s -X POST "${BASE_URL}/auth/user/emailpass" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ FAILED: Could not authenticate"
  exit 1
fi
echo "✅ Authenticated successfully"
echo ""

# Test 1: Basic Export (All Products)
echo "Test 1: Basic Export - All Products"
echo "-------------------------------------"
RESPONSE=$(curl -s -X POST "${BASE_URL}/admin/products/export" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"filters":{},"select":["*"]}')

echo "Response:"
echo "$RESPONSE" | jq .
echo ""

# Extract file details
FILE_URL=$(echo "$RESPONSE" | jq -r '.file.url')
FILE_ID=$(echo "$RESPONSE" | jq -r '.file.id')
TRANSACTION_ID=$(echo "$RESPONSE" | jq -r '.transaction_id')
MESSAGE=$(echo "$RESPONSE" | jq -r '.message')

# Verify response structure
echo "Validation:"
if [ "$MESSAGE" == "Product export completed successfully" ]; then
  echo "✅ Message: Correct success message"
else
  echo "❌ Message: Expected 'Product export completed successfully', got '$MESSAGE'"
fi

if [ ! -z "$TRANSACTION_ID" ] && [ "$TRANSACTION_ID" != "null" ]; then
  echo "✅ Transaction ID: Present ($TRANSACTION_ID)"
else
  echo "❌ Transaction ID: Missing or null"
fi

if [ ! -z "$FILE_URL" ] && [ "$FILE_URL" != "null" ]; then
  echo "✅ File URL: Present ($FILE_URL)"
else
  echo "❌ File URL: Missing or null"
fi

if [ ! -z "$FILE_ID" ] && [ "$FILE_ID" != "null" ]; then
  echo "✅ File ID: Present ($FILE_ID)"
else
  echo "❌ File ID: Missing or null"
fi

echo ""

# Test 2: Verify File Exists in Static Directory
echo "Test 2: File System Verification"
echo "-------------------------------------"
STATIC_DIR="/home/simon/Dev/sigreer/sharewear.clothing/apps/server/static"
if [ -f "${STATIC_DIR}/${FILE_ID}" ]; then
  FILE_SIZE=$(ls -lh "${STATIC_DIR}/${FILE_ID}" | awk '{print $5}')
  echo "✅ CSV file exists: ${FILE_ID} (${FILE_SIZE})"
else
  echo "❌ CSV file NOT found: ${FILE_ID}"
fi
echo ""

# Test 3: Verify Filename Format (Single Timestamp)
echo "Test 3: Filename Format Validation"
echo "-------------------------------------"
if [[ $FILE_ID =~ ^[0-9]{13}-product-exports\.csv$ ]]; then
  echo "✅ Filename format correct: Single timestamp prefix"
  echo "   Pattern: {timestamp}-product-exports.csv"
  echo "   Actual: $FILE_ID"
else
  echo "❌ Filename format incorrect: $FILE_ID"
  echo "   Expected pattern: {timestamp}-product-exports.csv"
fi
echo ""

# Test 4: File Download Test
echo "Test 4: File Download and Accessibility"
echo "-------------------------------------"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FILE_URL")
if [ "$HTTP_STATUS" == "200" ]; then
  echo "✅ File accessible: HTTP $HTTP_STATUS"

  # Download and check content
  CONTENT=$(curl -s "$FILE_URL" | head -2)
  echo "CSV Preview (first 2 lines):"
  echo "$CONTENT"

  # Verify CSV header
  if echo "$CONTENT" | head -1 | grep -q "Product Id"; then
    echo "✅ CSV header valid"
  else
    echo "❌ CSV header invalid or missing"
  fi
else
  echo "❌ File NOT accessible: HTTP $HTTP_STATUS"
fi
echo ""

# Test 5: Export with Filters
echo "Test 5: Export with Filters (Published Products)"
echo "-------------------------------------"
RESPONSE_FILTERED=$(curl -s -X POST "${BASE_URL}/admin/products/export" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"filters":{"status":["published"]},"select":["id","title","status"]}')

FILE_ID_FILTERED=$(echo "$RESPONSE_FILTERED" | jq -r '.file.id')

if [ ! -z "$FILE_ID_FILTERED" ] && [ "$FILE_ID_FILTERED" != "null" ]; then
  echo "✅ Filtered export successful: $FILE_ID_FILTERED"
else
  echo "❌ Filtered export failed"
fi
echo ""

# Test 6: Multiple Consecutive Exports
echo "Test 6: Multiple Consecutive Exports"
echo "-------------------------------------"
declare -a EXPORT_IDS=()
for i in {1..3}; do
  RESP=$(curl -s -X POST "${BASE_URL}/admin/products/export" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H 'Content-Type: application/json' \
    -d '{"filters":{},"select":["*"]}')
  EXPORT_ID=$(echo "$RESP" | jq -r '.file.id')
  EXPORT_IDS+=("$EXPORT_ID")
  echo "  Export $i: $EXPORT_ID"
  sleep 0.1
done

# Check for unique filenames
UNIQUE_COUNT=$(printf '%s\n' "${EXPORT_IDS[@]}" | sort -u | wc -l)
if [ "$UNIQUE_COUNT" -eq 3 ]; then
  echo "✅ All exports have unique filenames (no conflicts)"
else
  echo "❌ Duplicate filenames detected"
fi
echo ""

# Test 7: Invalid Auth
echo "Test 7: Invalid Authentication"
echo "-------------------------------------"
INVALID_RESPONSE=$(curl -s -X POST "${BASE_URL}/admin/products/export" \
  -H "Authorization: Bearer invalid_token_12345" \
  -H 'Content-Type: application/json' \
  -d '{"filters":{},"select":["*"]}')

if echo "$INVALID_RESPONSE" | grep -q "Unauthorized\|Unauthenticated\|401"; then
  echo "✅ Correctly rejects invalid authentication"
else
  echo "❌ Should reject invalid authentication"
  echo "Response: $INVALID_RESPONSE"
fi
echo ""

# Summary
echo "=========================================="
echo "Re-Validation Test Summary"
echo "=========================================="
echo "All critical tests completed."
echo ""
echo "Created CSV files:"
ls -lh ${STATIC_DIR}/*.csv 2>/dev/null | tail -5
echo ""
