import paramiko
import tarfile
import os
import sys

host = '192.168.0.15'
username = 'ti'
password = '#Phgs@7495$'
remote_dir = '/opt/telemetry/app/Project-Agro-main'
local_dir = r'C:\Users\User\Documents\Pedro\Pessoal\Project\Project-Agro-main'
tar_path = r'C:\Users\User\Documents\Pedro\Pessoal\Project\Project-Agro-main\deploy.tar.gz'

print("Creating tar archive...")
def exclude_files(tarinfo):
    name = tarinfo.name
    # Exclude heavy/unnecessary folders
    excludes = ['node_modules', '.next', '.venv', '.git', 'pgdata', '__pycache__', 'deploy.tar.gz']
    for ex in excludes:
        if ex in name:
            return None
    return tarinfo

with tarfile.open(tar_path, "w:gz") as tar:
    tar.add(local_dir, arcname='.', filter=exclude_files)

print("Connecting to server...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=username, password=password, timeout=10)

print("Uploading tar archive...")
sftp = client.open_sftp()
sftp.put(tar_path, '/tmp/deploy.tar.gz')
sftp.close()

print("Extracting on server and building docker (this may take a few minutes)...")
# Run it in the background using nohup and redirect logs, so it never dies when SSH disconnects
cmd = f"echo '{password}' | sudo -S sh -c 'tar -xzf /tmp/deploy.tar.gz -C {remote_dir} && cd {remote_dir} && nohup docker compose -f docker-compose.prod.yml up -d --build frontend api > /tmp/deploy_build.log 2>&1 &'"

stdin, stdout, stderr = client.exec_command(cmd)
# wait for command to be accepted
stdout.read()

client.close()
print("DEPLOYMENT TRIGGERED! Docker is building in the background on the server.")
