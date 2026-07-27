import requests

FLESPI_TOKEN = "FlespiToken eEjkJiO3csQob0YLjjKCaDNNhMQyippkFsVj2ikxtTKtJATU2LfzAkbBCW5RJ4YR"

resp = requests.get(
    "https://flespi.io/gw/devices/all",
    headers={"Authorization": FLESPI_TOKEN}
)
data = resp.json().get("result", [])
print(f"Total devices: {len(data)}")
for d in data:
    ident = d.get("configuration", {}).get("ident")
    name = d.get("name")
    print(f"ID: {d['id']} | Name: {name} | Ident: {ident}")
