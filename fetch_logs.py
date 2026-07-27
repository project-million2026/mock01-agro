import paramiko

host = '192.168.0.15'
username = 'ti'
password = '#Phgs@7495$'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=username, password=password, timeout=10)

cmd = f"echo '{password}' | sudo -S docker logs --tail 200 agro_api"
stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:", stdout.read().decode(errors='ignore'))
print("STDERR:", stderr.read().decode(errors='ignore'))

client.close()
