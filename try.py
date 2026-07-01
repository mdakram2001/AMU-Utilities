import urllib.request
import json

def fetch_trains():
    url = "https://cttrainsapi.confirmtkt.com/api/v1/trains/search?sourceStationCode=CNB&destinationStationCode=PNBE&dateOfJourney=11-07-2026"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
    }
    
    print(f"Fetching data from: {url}...")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                print("Data fetched successfully!")
                print(json.dumps(data, indent=2))
            else:
                print(f"Failed to fetch data. Status code: {response.status}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    fetch_trains()
