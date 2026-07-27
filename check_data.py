import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('192.168.0.15', username='ti', password='#Phgs@7495$', timeout=15)
sql = "UPDATE fleets SET flespi_device_id = 8539920 WHERE flespi_ident = '0009'; UPDATE fleets SET flespi_device_id = 8592857 WHERE flespi_ident = '0010';"
cmd = f"echo '#Phgs@7495$' | sudo -S docker exec agro_postgres psql -U agro_user -d agro_telemetry -c \"{sql}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode())
client.close()
