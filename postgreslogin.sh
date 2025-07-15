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

# Execute safely using --set and format()
echo "===== Creating user and database safely ====="

sudo -u postgres psql --set=pg_user="${pg_user}" --set=pg_pass="${pg_pass}" --set=pg_db="${pg_db}" <<'EOF'
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_roles WHERE rolname = :'pg_user'
    ) THEN
        EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', :'pg_user', :'pg_pass');
    END IF;
END
$$;

DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_database WHERE datname = :'pg_db'
    ) THEN
        EXECUTE format('CREATE DATABASE %I OWNER %I', :'pg_db', :'pg_user');
    END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE :"pg_db" TO :"pg_user";
EOF

# Generate DATABASE_URL
db_url="postgresql://${pg_user}:${pg_pass}@localhost:5432/${pg_db}"

echo
echo "✅ Database and user created securely!"
echo "📌 Generated DATABASE_URL:"
echo "$db_url"

# Optional .env file
read -p "Do you want to save it in a .env file? (y/n): " save_env
if [[ "$save_env" == "y" ]]; then
    echo "DATABASE_URL=\"$db_url\"" > .env
    echo "[✓] DATABASE_URL saved to .env"
fi
