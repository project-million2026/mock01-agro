import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('192.168.0.15', username='ti', password='#Phgs@7495$', timeout=15)
stdin, stdout, stderr = client.exec_command("echo '#Phgs@7495$' | sudo -S docker restart agro_api")
print(stdout.read().decode())
print(stderr.read().decode())
client.close()
