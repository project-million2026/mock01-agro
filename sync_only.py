import paramiko
import os

host = '192.168.0.15'
username = 'ti'
password = '#Phgs@7495$'
remote_dir = '/opt/telemetry/app/Project-Agro-main'

files_to_sync = [
    'app/(app)/farms/page.js',
    'app/(app)/buildings/page.js',
    'app/(app)/fields/page.js',
    'components/pages/CrudPage.js',
    'components/WeatherMap.js',
    'components/MapView.js',
    'python-backend/models.py',
    'python-backend/schemas.py',
    'python-backend/services/geofencing.py',
    'Dockerfile.frontend'
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=username, password=password, timeout=10)
sftp = client.open_sftp()

for file in files_to_sync:
    local_path = file
    tmp_path = f"/tmp/{os.path.basename(file)}"
    remote_path = f"{remote_dir}/{file}"
    print(f"Syncing {file}...")
    sftp.put(local_path, tmp_path)
    client.exec_command(f"echo '{password}' | sudo -S mkdir -p \"{os.path.dirname(remote_path)}\"")
    client.exec_command(f"echo '{password}' | sudo -S mv \"{tmp_path}\" \"{remote_path}\"")
    
sftp.close()

# Also run docker build
print("Building frontend...")
cmd = f"cd {remote_dir} && echo '{password}' | sudo -S docker compose -f docker-compose.prod.yml up -d --build frontend api"
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode().strip())
print(stderr.read().decode().strip())

client.close()
print("FILES_SYNCED_AND_BUILT")
