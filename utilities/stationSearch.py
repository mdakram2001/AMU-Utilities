import json
from rapidfuzz import process, fuzz


def find_station_code(query, json_file="stationList.json", score_cutoff=70):
    with open(json_file, "r", encoding="utf-8") as f:
        stations = json.load(f)

    query = query.strip().upper()

    # Exact code
    if query in stations:
        return query

    # Exact name
    for code, name in stations.items():
        if query == name.upper():
            return code

    choices = {}
    for code, name in stations.items():
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