#!/bin/bash

# PostgreSQL Database Initialization Script
# This script connects to the BTP PostgreSQL database and initializes the schema

# Database connection details (from service key)
PGHOST="postgres-81397d70-2234-4e79-afad-4069e027f432.crkc3ulytfr9.eu-central-1.rds.amazonaws.com"
PGPORT="8455"
PGDATABASE="LjYuquxpiCOc"
PGUSER="51fec5b3a422"
PGPASSWORD="16d5245f412d50043f"

export PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD

echo "Connecting to PostgreSQL database..."
echo "Host: $PGHOST"
echo "Database: $PGDATABASE"
echo ""

# Execute the schema file
echo "Initializing database schema..."
psql -f btp-postgres-schema.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database initialized successfully!"
    echo ""
    echo "Verifying tables created:"
    psql -c "\dt public.*"
else
    echo ""
    echo "❌ Database initialization failed!"
    exit 1
fi
