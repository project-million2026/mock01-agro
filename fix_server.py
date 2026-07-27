import paramiko
import sys

host = '192.168.0.15'
username = 'ti'
password = '#Phgs@7495$'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print(f"Connecting to {host} as {username}...")
    try:
        client.connect(host, username=username, password=password, timeout=10)
    except Exception:
        print("Failed with 'ti', trying 'root'...")
        username = 'root'
        client.connect(host, username=username, password=password, timeout=10)

    print("Connected! Executing reset command...")
    
    cmd = """docker exec agro_api python -c "
import asyncio
from database import AsyncSessionLocal
from models import User
from core.security import get_password_hash
from sqlalchemy import select
async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == 'admin@telemetria.com'))
        u = res.scalars().first()
        if u:
            u.password_hash = get_password_hash('admin')
            await db.commit()
            print('SUCCESS_ADMIN_RESET')
        else:
            print('ERROR_NO_ADMIN')
asyncio.run(main())"
"""
    # For sudo if needed
    if username == 'ti':
        cmd = f"echo '{password}' | sudo -S {cmd}"
        
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8').strip()
    err = stderr.read().decode('utf-8').strip()
    
    print("OUTPUT:", out)
    if err:
        print("ERROR:", err)
    
finally:
    client.close()
