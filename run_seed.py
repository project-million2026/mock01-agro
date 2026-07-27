import paramiko

host = '192.168.0.15'
username = 'ti'
password = '#Phgs@7495$'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=username, password=password, timeout=10)

cmd = 'docker exec agro_api sh -c "DATABASE_URL=\\$ALEMBIC_DATABASE_URL python seed.py"'
sudo_cmd = f"echo '{password}' | sudo -S {cmd}"

stdin, stdout, stderr = client.exec_command(sudo_cmd)
print("OUT:", stdout.read().decode().strip())
print("ERR:", stderr.read().decode().strip())

client.close()
