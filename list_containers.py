import paramiko

host = '192.168.0.15'
username = 'ti'
password = '#Phgs@7495$'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=username, password=password, timeout=15)

# List docker containers
stdin, stdout, stderr = client.exec_command("echo '%s' | sudo -S docker ps --format '{{.Names}}' 2>&1" % password)
out = stdout.read().decode(errors='ignore')
print("Containers:", out)

client.close()
