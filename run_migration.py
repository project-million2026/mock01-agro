import paramiko

host = '192.168.0.15'
username = 'ti'
password = '#Phgs@7495$'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=username, password=password, timeout=15)

db_user = 'agro_user'
db_name = 'agro_telemetry'

sql_statements = [
    "ALTER TABLE buildings ADD COLUMN IF NOT EXISTS polygon geometry(POLYGON,4326);",
    "ALTER TABLE buildings ADD COLUMN IF NOT EXISTS area_sqm FLOAT;",
    "ALTER TABLE buildings ALTER COLUMN latitude DROP NOT NULL;",
    "ALTER TABLE buildings ALTER COLUMN longitude DROP NOT NULL;",
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='buildings' ORDER BY ordinal_position;",
]

for sql in sql_statements:
    cmd = "echo '%s' | sudo -S docker exec agro_postgres psql -U %s -d %s -c \"%s\" 2>&1" % (password, db_user, db_name, sql)
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode(errors='ignore')
    print(f"SQL: {sql[:60]}")
    print(f"OUT: {out[:300]}")
    print()

client.close()
print("Migration complete!")
