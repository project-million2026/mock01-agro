import paramiko
import json

host = '192.168.0.15'
username = 'ti'
password = '#Phgs@7495$'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=username, password=password, timeout=10)

# 1. Get valid fleets from Postgres
cmd_pg = f"echo '{password}' | sudo -S docker exec agro_postgres psql -U postgres -d agro -t -c \"SELECT fleet_number FROM fleets;\""
stdin, stdout, stderr = client.exec_command(cmd_pg)
pg_out = stdout.read().decode(errors='ignore')
pg_err = stderr.read().decode(errors='ignore')
print("PG ERR:", pg_err)
valid_fleets = {line.strip() for line in pg_out.split('\n') if line.strip()}
print("Valid fleets:", valid_fleets)

# 2. Get live_positions from Redis
cmd_redis1 = f"echo '{password}' | sudo -S docker exec agro_redis redis-cli HKEYS live_positions"
stdin, stdout, stderr = client.exec_command(cmd_redis1)
redis_live = stdout.read().decode(errors='ignore').split('\n')
live_keys = {line.strip() for line in redis_live if line.strip()}
print("Redis live_positions keys:", live_keys)

# 3. Get machine_state from Redis
cmd_redis2 = f"echo '{password}' | sudo -S docker exec agro_redis redis-cli HKEYS machine_state"
stdin, stdout, stderr = client.exec_command(cmd_redis2)
redis_state = stdout.read().decode(errors='ignore').split('\n')
state_keys = {line.strip() for line in redis_state if line.strip()}
print("Redis machine_state keys:", state_keys)

# 4. Find ghosts
ghosts_live = live_keys - valid_fleets
ghosts_state = state_keys - valid_fleets
print("Ghosts in live_positions:", ghosts_live)
print("Ghosts in machine_state:", ghosts_state)

# 5. Delete ghosts
for g in ghosts_live:
    cmd = f"echo '{password}' | sudo -S docker exec agro_redis redis-cli HDEL live_positions \"{g}\""
    client.exec_command(cmd)

for g in ghosts_state:
    cmd = f"echo '{password}' | sudo -S docker exec agro_redis redis-cli HDEL machine_state \"{g}\""
    client.exec_command(cmd)

print("Ghosts deleted.")
client.close()
