#!/bin/bash

echo "===== Checking PostgreSQL installation ====="

# Check if PostgreSQL is installed
if ! command -v psql >/dev/null 2>&1; then
    echo "[+] PostgreSQL not found. Installing..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
else
    echo "[✓] PostgreSQL is already installed."
fi

echo "===== Starting PostgreSQL service ====="
sudo systemctl enable postgresql
sudo systemctl start postgresql

# User input
read -p "Enter the new PostgreSQL username: " pg_user
read -s -p "Enter the password for user $pg_user: " pg_pass
echo
read -p "Enter the name of the database to create: " pg_db

# Execute SQL commands as the postgres user
echo "===== Creating user and database ====="

sudo -u postgres psql <<EOF
DO
\$do\$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles WHERE rolname = '$pg_user'
   ) THEN
      CREATE ROLE $pg_user LOGIN PASSWORD '$pg_pass';
   END IF;
END
\$do\$;

CREATE DATABASE $pg_db OWNER $pg_user;
GRANT ALL PRIVILEGES ON DATABASE $pg_db TO $pg_user;
EOF

# Generate DATABASE_URL
db_url="postgresql://$pg_user:$pg_pass@localhost:5432/$pg_db"

echo
echo "✅ Database and user created successfully!"
echo "📌 Generated DATABASE_URL:"
echo "$db_url"

# Optionally save to .env file
read -p "Do you want to save it in a .env file? (y/n): " save_env
if [[ "$save_env" == "y" ]]; then
    echo "DATABASE_URL=\"$db_url\"" > .env
    echo "[✓] DATABASE_URL saved to .env"
fi
