import paramiko

host = '192.168.0.15'
username = 'ti'
password = '#Phgs@7495$'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=username, password=password, timeout=10)

cmd = "cat /opt/telemetry/app/Project-Agro-main/app/\\(app\\)/farms/page.js | grep ibge"
stdin, stdout, stderr = client.exec_command(cmd)
print("OUT:", stdout.read().decode().strip())
print("ERR:", stderr.read().decode().strip())

client.close()
