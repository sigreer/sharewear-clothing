#!/bin/bash

# Regression Tests - Verify Existing Functionality

echo "Regression Tests"
echo "================"
echo ""

# Test 1: Static file serving (images)
echo "Test 1: Static File Serving (Images)"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://sharewear.local:9000/static/1759585602341-4DGTC_SQ1_0000000470_GREY_MELANGE_MDf.jfif)
if [ "$HTTP_STATUS" == "200" ]; then
  echo "✅ Image files accessible (HTTP $HTTP_STATUS)"
else
  echo "❌ Image files NOT accessible (HTTP $HTTP_STATUS)"
fi
echo ""

# Test 2: Admin API - Products list
echo "Test 2: Admin API - Products List"
TOKEN=$(curl -s -X POST 'http://sharewear.local:9000/auth/user/emailpass' \
  -H 'Content-Type: application/json' \
  -d '{"email":"qatest@admin.com","password":"testpass123"}' | jq -r '.token')

PRODUCT_COUNT=$(curl -s "http://sharewear.local:9000/admin/products?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.products | length')

if [ "$PRODUCT_COUNT" -gt 0 ]; then
  echo "✅ Products API working (returned $PRODUCT_COUNT products)"
else
  echo "❌ Products API issue (returned $PRODUCT_COUNT products)"
fi
echo ""

# Test 3: Database connectivity
echo "Test 3: Database Connectivity"
DB_COUNT=$(PGPASSWORD=postgres psql -h localhost -p 55432 -U postgres -d shareweardb -t -c "SELECT COUNT(*) FROM product WHERE deleted_at IS NULL;")
DB_COUNT=$(echo $DB_COUNT | tr -d ' ')

if [ "$DB_COUNT" -gt 0 ]; then
  echo "✅ Database accessible ($DB_COUNT products in DB)"
else
  echo "❌ Database issue ($DB_COUNT products)"
fi
echo ""

echo "Regression Tests Complete"
