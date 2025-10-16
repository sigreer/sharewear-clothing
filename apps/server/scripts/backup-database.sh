#!/bin/bash
set -e

TIMESTAMP=$(date +%Y-%m-%d-%H-%M-%S)
BACKUP_DIR="backups"
BACKUP_FILE="$BACKUP_DIR/shareweardb-$TIMESTAMP.sql"

echo "Starting database backup..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Perform backup
PGPASSWORD=postgres pg_dump -h localhost -p 55432 -U postgres shareweardb > "$BACKUP_FILE"

# Check if backup was successful
if [ -s "$BACKUP_FILE" ]; then
  FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✓ Backup created successfully: $BACKUP_FILE"
  echo "  Size: $FILE_SIZE"
else
  echo "✗ Backup failed - file is empty or missing"
  exit 1
fi
