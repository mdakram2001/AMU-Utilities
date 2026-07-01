import json
import urllib.request
from typing import List, Dict, Any, Annotated
from pydantic import BaseModel, Field, field_validator
from utilities.stationSearch import find_station_code
from datetime import date, datetime

class FindTicket(BaseModel):
    source: Annotated[str, Field(..., description='Source Station Code or Name')]
    destination: Annotated[str, Field(..., description='Destination Station Code or Name')]
    date_of_journey: Annotated[date, Field(..., description='Date of Journey in DD-MM-YYYY format')]

    @field_validator("date_of_journey", mode='before')
    @classmethod
    def validate_date(cls, val):
        d = datetime.strptime(val, "%d-%m-%Y").date()
        
        if d < date.today():
            raise ValueError("Journey date cannot be in the past.")
        return d

def find_train_availability(
    find_ticket: FindTicket
) -> List[Dict[str, Any]]:
    """
    Search for trains matching the source, destination, and date of journey,
    and return their details and seat availability.
    
    :param find_ticket: The FindTicket object containing source, destination, and date_of_journey.
    :return: A list of matching trains with their availability details.
    """
    # Standardize input for comparison
    source_code = find_station_code(find_ticket.source)
    dest_code = find_station_code(find_ticket.destination)
    target_date = find_ticket.date_of_journey.strftime("%d-%m-%Y")  # Expected format DD-MM-YYYY

    if not source_code or not dest_code:
        raise ValueError(f"Please Enter the Correct Source/Destination Code'{find_ticket.source}' or destination '{find_ticket.destination}'")

    # get data from  cttrainsapi.confirmtkt.com
    url = f"https://cttrainsapi.confirmtkt.com/api/v1/trains/search?sourceStationCode={source_code}&destinationStationCode={dest_code}&dateOfJourney={target_date}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
            else:
                raise ValueError(f"Failed to fetch data. Status code: {response.status}")
    except Exception as e:
        raise ValueError(f"Error: {e}")

    # Handle both nested and root-level 'trainList' structures
    if "data" in data and isinstance(data["data"], dict) and "trainList" in data["data"]:
        train_list = data["data"]["trainList"]
    elif "trainList" in data:
        train_list = data["trainList"]
    else:
        train_list = []

    # Convert target_date from DD-MM-YYYY to YYYY-MM-DD for comparison with cache date
    compare_date = target_date
    try:
        parts = target_date.split("-")
        if len(parts) == 3 and len(parts[0]) == 2:  # DD-MM-YYYY
            compare_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
    except Exception:
        raise ValueError("Please Enter the Correct Date Format i.e(DD-MM-YYYY)")

    results = []

    for train in train_list:
        from_code = train.get("fromStnCode", "")
        from_name = train.get("fromStnName", "")
        to_code = train.get("toStnCode", "")
        to_name = train.get("toStnName", "")

        # Check if source and destination match
        source_matches = (source_code == from_code) or (source_code in from_name)
        dest_matches = (dest_code == to_code) or (dest_code in to_name)

        if source_matches and dest_matches:
            matching_classes = []
            
            # Check availability cache
            avail_cache = train.get("availabilityCache", {})
            for travel_class, info in avail_cache.items():
                cache_date = info.get("date", "")
                # Extract date part (YYYY-MM-DD) from ISO format (e.g., 2026-08-11T00:00:00)
                cache_date_str = cache_date.split("T")[0] if cache_date else ""
                
                if cache_date_str == compare_date:
                    matching_classes.append({
                        "class": travel_class,
                        "availability": info.get("availability", "N/A"),
                        "fare": info.get("fare", "N/A"),
                        # "prediction": info.get("prediction", "N/A"),
                        # "prediction_percentage": info.get("predictionPercentage", 0),
                        "confirm_status": info.get("confirmTktStatus", "N/A"),
                        # "display_name": info.get("availabilityDisplayName", "N/A")
                    })
            
            # If classes found for the given date, append train details
            if matching_classes:
                results.append({
                    "train_number": train.get("trainNumber"),
                    "train_name": train.get("trainName"),
                    # "from_station": f"{train.get('fromStnName')} ({train.get('fromStnCode')})",
                    # "to_station": f"{train.get('toStnName')} ({train.get('toStnCode')})",
                    "departure_time": train.get("departureTime"),
                    # "arrival_time": train.get("arrivalTime"),
                    # "duration_mins": train.get("duration"),
                    "running_days": train.get("runningDays"),
                    "availability": matching_classes
                })

    return results

