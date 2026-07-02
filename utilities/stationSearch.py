import json
from rapidfuzz import process, fuzz

with open("stationList.json", "r", encoding="utf-8") as f:
    STATIONS = json.load(f)

def find_station_code(query, score_cutoff=70):
    query = query.strip().upper()

    # Exact code
    if query in STATIONS:
        return query

    # Exact name
    for code, name in STATIONS.items():
        if query == name.upper():
            return code

    choices = {}
    for code, name in STATIONS.items():
        choices[code.upper()] = code
        choices[name.upper()] = code

    result = process.extractOne(
        query,
        choices.keys(),
        scorer=fuzz.WRatio,
        score_cutoff=score_cutoff
    )

    if result:
        return choices[result[0]]

    return None