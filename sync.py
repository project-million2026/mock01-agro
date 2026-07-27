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
    'python-backend/models.py',
    'python-backend/schemas.py',
    'python-backend/services/geofencing.py',
    'Dockerfile.frontend'
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Connecting...")
    client.connect(host, username=username, password=password, timeout=10)
    sftp = client.open_sftp()
    
    for file in files_to_sync:
        local_path = file
        tmp_path = f"/tmp/{os.path.basename(file)}"
        remote_path = f"{remote_dir}/{file}"
        print(f"Syncing {local_path} -> {remote_path}")
        
        try:
            # Upload to /tmp
            sftp.put(local_path, tmp_path)
            
            # Use sudo to move the file and set permissions
            remote_dir_path = os.path.dirname(remote_path)
            mkdir_cmd = f"echo '{password}' | sudo -S mkdir -p \"{remote_dir_path}\""
            client.exec_command(mkdir_cmd)
            
            mv_cmd = f"echo '{password}' | sudo -S mv \"{tmp_path}\" \"{remote_path}\""
            client.exec_command(mv_cmd)
            
        except Exception as e:
            print(f"Failed to sync {file}: {e}")
            
    sftp.close()
    
    print("Restarting services on server...")
    # Build frontend and restart API to apply python changes
    cmd = f"cd {remote_dir} && echo '{password}' | sudo -S docker compose -f docker-compose.prod.yml up -d --build frontend api"
    stdin, stdout, stderr = client.exec_command(cmd)
    
    print("OUT:", stdout.read().decode().strip())
    print("ERR:", stderr.read().decode().strip())

finally:
    client.close()
