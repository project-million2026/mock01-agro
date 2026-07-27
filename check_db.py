import paramiko

host = '192.168.0.15'
username = 'ti'
password = '#Phgs@7495$'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=username, password=password, timeout=15)

db_user = 'agro_user'
db_name = 'agro_telemetry'

# Check columns
cmd = "echo '%s' | sudo -S docker exec agro_postgres psql -U %s -d %s -c \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='buildings' ORDER BY ordinal_position;\" 2>&1" % (password, db_user, db_name)
stdin, stdout, stderr = client.exec_command(cmd)
out = stdout.read().decode(errors='ignore')
print("Columns:", out)

client.close()
