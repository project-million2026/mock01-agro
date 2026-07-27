import paramiko

host = '192.168.0.15'
username = 'ti'
password = '#Phgs@7495$'

script = """
import sys
sys.path.append("/app")
import asyncio
from database import redis_client
from sqlalchemy import text
from database import AsyncSessionLocal

async def clean_ghosts():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT fleet_number FROM fleets"))
        valid_fleets = {str(r[0]) for r in res.fetchall()}
    
    live_keys = await redis_client.hkeys("live_positions")
    live_keys = [k.decode('utf-8') if isinstance(k, bytes) else k for k in live_keys]
    
    state_keys = await redis_client.hkeys("machine_state")
    state_keys = [k.decode('utf-8') if isinstance(k, bytes) else k for k in state_keys]
    
    ghosts_live = [k for k in live_keys if k not in valid_fleets]
    ghosts_state = [k for k in state_keys if k not in valid_fleets]
    
    print(f"Valid fleets: {valid_fleets}")
    print(f"Ghost live_positions to remove: {ghosts_live}")
    print(f"Ghost machine_state to remove: {ghosts_state}")
    
    if ghosts_live:
        await redis_client.hdel("live_positions", *ghosts_live)
    if ghosts_state:
        await redis_client.hdel("machine_state", *ghosts_state)
        
    print("Done cleaning up ghosts.")
    await redis_client.aclose()

asyncio.run(clean_ghosts())
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=username, password=password, timeout=10)

sftp = client.open_sftp()
with sftp.file('/tmp/clean_redis.py', 'w') as f:
    f.write(script)
sftp.close()

# Find the API container dynamically
stdin, stdout, stderr = client.exec_command(f"echo '{password}' | sudo -S docker ps --format '{{{{.Names}}}}' | grep api")
api_container = stdout.read().decode(errors='ignore').strip().split('\n')[0]

if api_container:
    cmd_cp = f"echo '{password}' | sudo -S docker cp /tmp/clean_redis.py {api_container}:/tmp/clean_redis.py"
    client.exec_command(cmd_cp)[1].read()

    cmd_exec = f"echo '{password}' | sudo -S docker exec {api_container} python /tmp/clean_redis.py"
    stdin, stdout, stderr = client.exec_command(cmd_exec)
    print("STDOUT:", stdout.read().decode(errors='ignore'))
    print("STDERR:", stderr.read().decode(errors='ignore'))
else:
    print("No API container found!")

client.close()
