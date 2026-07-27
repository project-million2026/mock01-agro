import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('192.168.0.15', username='ti', password='#Phgs@7495$', timeout=15)
stdin, stdout, stderr = client.exec_command("echo '#Phgs@7495$' | sudo -S docker logs --tail 300 agro_frontend")
with open("front_logs.txt", "w", encoding="utf-8") as f:
    f.write(stdout.read().decode('utf-8', errors='replace'))
    f.write(stderr.read().decode('utf-8', errors='replace'))
client.close()
