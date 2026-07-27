import paramiko
import time

host = '192.168.0.15'
username = 'ti'
password = '#Phgs@7495$'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=username, password=password, timeout=10)

print("Monitoring docker ps...")
while True:
    stdin, stdout, stderr = client.exec_command(f"echo '{password}' | sudo -S docker ps --format '{{{{.Names}}}} ||| {{{{.Status}}}}'")
    output = stdout.read().decode(errors='ignore')
    
    frontend_status = ""
    for line in output.split('\n'):
        if 'agro_frontend' in line:
            frontend_status = line
            break
            
    if frontend_status:
        status_part = frontend_status.split('|||')[1].strip()
        print(f"Current status: {status_part}")
        # If it doesn't contain 'hours', it means it just restarted!
        if 'hours' not in status_part:
            print(f"FRONTEND RESTARTED: {frontend_status}")
            break
            
    time.sleep(15) 

client.close()
