import paramiko
import re

host = '192.168.0.15'
username = 'ti'
password = '#Phgs@7495$'
token = 'eEjkJiO3csQob0YLjjKCaDNNhMQyippkFsVj2ikxtTKtJATU2LfzAkbBCW5RJ4YR'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=username, password=password, timeout=10)

cmd = f"echo '{password}' | sudo -S cat /opt/telemetry/app/Project-Agro-main/python-backend/.env"
stdin, stdout, stderr = client.exec_command(cmd)
env_content = stdout.read().decode(errors='ignore')

if "FLESPI_TOKEN=" in env_content:
    new_env = re.sub(r'FLESPI_TOKEN=.*', f'FLESPI_TOKEN="{token}"', env_content)
else:
    new_env = env_content + f'\nFLESPI_TOKEN="{token}"\n'

# Write back
sftp = client.open_sftp()
with sftp.file('/tmp/.env.new', 'w') as f:
    f.write(new_env)
sftp.close()

cmd_mv = f"echo '{password}' | sudo -S mv /tmp/.env.new /opt/telemetry/app/Project-Agro-main/python-backend/.env && echo '{password}' | sudo -S docker restart agro_api"
client.exec_command(cmd_mv)

print("Token updated and API restarted!")
client.close()
