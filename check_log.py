import paramiko

host = '192.168.0.15'
username = 'ti'
password = '#Phgs@7495$'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=username, password=password, timeout=10)

stdin, stdout, stderr = client.exec_command(f"echo '{password}' | sudo -S tail -n 50 /tmp/deploy_build.log")
print(stdout.read().decode(errors='ignore'))

client.close()
