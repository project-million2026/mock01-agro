import requests
FLESPI_TOKEN = 'FlespiToken eEjkJiO3csQob0YLjjKCaDNNhMQyippkFsVj2ikxtTKtJATU2LfzAkbBCW5RJ4YR'
resp = requests.get('https://flespi.io/gw/devices/8539920/messages', headers={'Authorization': FLESPI_TOKEN}, params={'count': 1, 'reverse': 1})
if resp.status_code == 200:
    msgs = resp.json().get('result', [])
    if msgs:
        msg = msgs[0]
        print(f"Lat: {msg.get('position.latitude')}, Lon: {msg.get('position.longitude')}")
    else:
        print('No messages')
else:
    print('Error:', resp.text)
