import requests
import json
import time
import matplotlib.pyplot as plt
import numpy as np
import random
from datetime import datetime, timedelta

# Configuration
API_URL = "http://localhost:5000"
SAVE_RESULTS = True
VISUALIZE_RESULTS = True

# Sample location data - these represent common scenarios to test
test_scenarios = {
    "home_location": {
        "description": "Testing privacy protection for a home location (sensitive POI)",
        "latitude": 37.774929,
        "longitude": -122.419416,
        "privacy_level": 8,  # High privacy for home
        "repeat_count": 10   # Visit home location multiple times to ensure it's identified as a POI
    },
    "work_location": {
        "description": "Testing privacy protection for a work location (sensitive POI)",
        "latitude": 37.789366, 
        "longitude": -122.400526,
        "privacy_level": 7,  # High privacy for work
        "repeat_count": 8    # Visit work location multiple times
    },
    "coffee_shop": {
        "description": "Testing privacy protection for occasional location (less sensitive)",
        "latitude": 37.783907,
        "longitude": -122.409291,
        "privacy_level": 5,  # Medium privacy
        "repeat_count": 3    # Visit a few times only
    },
    "one_time_location": {
        "description": "Testing privacy protection for a one-time visit",
        "latitude": 37.769045,
        "longitude": -122.486166,
        "privacy_level": 3,  # Lower privacy for non-sensitive location
        "repeat_count": 1    # Just visit once
    },
    "moving_path": {
        "description": "Testing privacy protection while moving (e.g., commute route)",
        "path": [
            {"latitude": 37.774929, "longitude": -122.419416},  # Start (home)
            {"latitude": 37.778653, "longitude": -122.414958},  # Point along path
            {"latitude": 37.781998, "longitude": -122.410667},  # Point along path
            {"latitude": 37.785331, "longitude": -122.406032},  # Point along path
            {"latitude": 37.789366, "longitude": -122.400526}   # End (work)
        ],
        "privacy_level": 5,  # Medium privacy for commute
        "repeat_count": 5    # Repeat this commute pattern several times
    }
}

# Generate a realistic location history over time
def generate_location_history():
    print("Generating realistic location history...")
    history = []
    
    # Start 30 days ago
    current_date = datetime.now() - timedelta(days=30)
    
    for day in range(30):  # Generate 30 days of data
        # Home in the morning
        for _ in range(test_scenarios["home_location"]["repeat_count"]):
            current_date += timedelta(minutes=random.randint(30, 120))
            history.append({
                "latitude": test_scenarios["home_location"]["latitude"] + random.uniform(-0.0001, 0.0001),
                "longitude": test_scenarios["home_location"]["longitude"] + random.uniform(-0.0001, 0.0001),
                "timestamp": current_date.isoformat()
            })
        
        # Commute to work
        for point in test_scenarios["moving_path"]["path"]:
            current_date += timedelta(minutes=random.randint(5, 15))
            history.append({
                "latitude": point["latitude"] + random.uniform(-0.0002, 0.0002),
                "longitude": point["longitude"] + random.uniform(-0.0002, 0.0002),
                "timestamp": current_date.isoformat()
            })
        
        # At work during the day
        for _ in range(test_scenarios["work_location"]["repeat_count"]):
            current_date += timedelta(minutes=random.randint(30, 90))
            history.append({
                "latitude": test_scenarios["work_location"]["latitude"] + random.uniform(-0.0001, 0.0001),
                "longitude": test_scenarios["work_location"]["longitude"] + random.uniform(-0.0001, 0.0001),
                "timestamp": current_date.isoformat()
            })
        
        # Sometimes visit coffee shop
        if random.random() < 0.7:  # 70% chance to visit coffee shop
            current_date += timedelta(minutes=random.randint(30, 60))
            history.append({
                "latitude": test_scenarios["coffee_shop"]["latitude"] + random.uniform(-0.0001, 0.0001),
                "longitude": test_scenarios["coffee_shop"]["longitude"] + random.uniform(-0.0001, 0.0001),
                "timestamp": current_date.isoformat()
            })
        
        # Commute back home (reverse path)
        for point in reversed(test_scenarios["moving_path"]["path"]):
            current_date += timedelta(minutes=random.randint(5, 15))
            history.append({
                "latitude": point["latitude"] + random.uniform(-0.0002, 0.0002),
                "longitude": point["longitude"] + random.uniform(-0.0002, 0.0002),
                "timestamp": current_date.isoformat()
            })
        
        # Home in the evening
        for _ in range(test_scenarios["home_location"]["repeat_count"] // 2):
            current_date += timedelta(minutes=random.randint(30, 120))
            history.append({
                "latitude": test_scenarios["home_location"]["latitude"] + random.uniform(-0.0001, 0.0001),
                "longitude": test_scenarios["home_location"]["longitude"] + random.uniform(-0.0001, 0.0001),
                "timestamp": current_date.isoformat()
            })
        
        # Occasionally visit random one-time locations
        if random.random() < 0.3:  # 30% chance for a random visit
            current_date += timedelta(minutes=random.randint(60, 180))
            random_lat = test_scenarios["one_time_location"]["latitude"] + random.uniform(-0.02, 0.02)
            random_lng = test_scenarios["one_time_location"]["longitude"] + random.uniform(-0.02, 0.02)
            history.append({
                "latitude": random_lat,
                "longitude": random_lng,
                "timestamp": current_date.isoformat()
            })
        
        # Move to next day
        current_date = current_date.replace(hour=7, minute=0) + timedelta(days=1)
    
    return history

# Test loading history to the backend
def test_load_history(history):
    print(f"Loading {len(history)} history points to the backend...")
    response = requests.post(f"{API_URL}/load_history", json={"history": history})
    
    if response.status_code == 200:
        result = response.json()
        print(f"Successfully loaded history. Detected {result['clusters']} clusters and {result['pois']} points of interest.")
        return True
    else:
        print(f"Failed to load history: {response.status_code}")
        print(response.text)
        return False

# Test protecting individual locations
def test_protect_locations():
    results = []
    
    # Test each static location
    for scenario_name, scenario in test_scenarios.items():
        if scenario_name == "moving_path":
            continue  # Skip path for now, we'll test it separately
        
        print(f"Testing scenario: {scenario['description']}")
        
        # Make multiple requests to test consistency
        scenario_results = []
        for i in range(scenario["repeat_count"]):
            # Add small variations to simulate real GPS readings
            lat_variation = random.uniform(-0.0001, 0.0001)
            lng_variation = random.uniform(-0.0001, 0.0001)
            
            test_lat = scenario["latitude"] + lat_variation
            test_lng = scenario["longitude"] + lng_variation
            
            response = requests.post(f"{API_URL}/protect_location", json={
                "latitude": test_lat,
                "longitude": test_lng,
                "privacy_level": scenario["privacy_level"],
                "save_history": True
            })
            
            if response.status_code == 200:
                result = response.json()
                print(f"  Request {i+1}: Original: ({test_lat:.6f}, {test_lng:.6f}) → Private: ({result['private']['latitude']:.6f}, {result['private']['longitude']:.6f})")
                print(f"  Sensitive location: {result['is_sensitive']}")
                
                # Calculate offset distance (approximation)
                lat_diff = result['private']['latitude'] - test_lat
                lng_diff = result['private']['longitude'] - test_lng
                # Rough conversion to meters (varies by latitude)
                meters_lat = lat_diff * 111111
                meters_lng = lng_diff * 111111 * np.cos(np.radians(test_lat))
                distance = np.sqrt(meters_lat**2 + meters_lng**2)
                
                result["approximate_distance_meters"] = distance
                result["scenario"] = scenario_name
                result["test_number"] = i
                
                scenario_results.append(result)
                time.sleep(0.1)  # Small delay between requests
            else:
                print(f"  Request {i+1} failed: {response.status_code}")
                print(response.text)
        
        results.extend(scenario_results)
    
    # Test the moving path
    path_scenario = test_scenarios["moving_path"]
    path_results = []
    
    print(f"Testing scenario: {path_scenario['description']}")
    
    for repeat in range(path_scenario["repeat_count"]):
        print(f"  Path repeat {repeat+1}:")
        path_points = []
        
        for i, point in enumerate(path_scenario["path"]):
            response = requests.post(f"{API_URL}/protect_location", json={
                "latitude": point["latitude"],
                "longitude": point["longitude"],
                "privacy_level": path_scenario["privacy_level"],
                "save_history": True
            })
            
            if response.status_code == 200:
                result = response.json()
                print(f"    Point {i+1}: Original: ({point['latitude']:.6f}, {point['longitude']:.6f}) → Private: ({result['private']['latitude']:.6f}, {result['private']['longitude']:.6f})")
                
                result["scenario"] = "moving_path"
                result["point_number"] = i
                result["repeat_number"] = repeat
                
                path_points.append(result)
                time.sleep(0.2)  # Small delay between requests
            else:
                print(f"    Point {i+1} failed: {response.status_code}")
        
        path_results.append(path_points)
    
    results.append({"path_results": path_results})
    
    return results

# Visualize the results
def visualize_results(history, results):
    if not VISUALIZE_RESULTS:
        return
    
    plt.figure(figsize=(12, 10))
    
    # Plot original history points
    history_lats = [point["latitude"] for point in history]
    history_lngs = [point["longitude"] for point in history]
    plt.scatter(history_lngs, history_lats, alpha=0.3, color='gray', label='History Points')
    
    # Plot static location scenarios
    colors = {
        "home_location": 'red',
        "work_location": 'blue',
        "coffee_shop": 'green',
        "one_time_location": 'purple'
    }
    
    # Extract static location results
    static_results = [r for r in results if isinstance(r, dict) and "scenario" in r and r["scenario"] != "moving_path"]
    
    for scenario_name, color in colors.items():
        # Original locations
        scenario_results = [r for r in static_results if r["scenario"] == scenario_name]
        if not scenario_results:
            continue
            
        orig_lats = [r["original"]["latitude"] for r in scenario_results]
        orig_lngs = [r["original"]["longitude"] for r in scenario_results]
        plt.scatter(orig_lngs, orig_lats, color=color, marker='o', label=f'{scenario_name} (Original)')
        
        # Private locations
        priv_lats = [r["private"]["latitude"] for r in scenario_results]
        priv_lngs = [r["private"]["longitude"] for r in scenario_results]
        plt.scatter(priv_lngs, priv_lats, color=color, marker='x', label=f'{scenario_name} (Private)')
        
        # Draw lines connecting original and private
        for i in range(len(scenario_results)):
            plt.plot([orig_lngs[i], priv_lngs[i]], [orig_lats[i], priv_lats[i]], color=color, linestyle='--', alpha=0.5)
    
    # Handle path results separately
    path_results_entry = next((r for r in results if isinstance(r, dict) and "path_results" in r), None)
    if path_results_entry:
        path_results = path_results_entry["path_results"]
        
        for path_repeat in path_results:
            if not path_repeat:
                continue
                
            # Original path
            orig_lats = [point["original"]["latitude"] for point in path_repeat]
            orig_lngs = [point["original"]["longitude"] for point in path_repeat]
            
            # Private path
            priv_lats = [point["private"]["latitude"] for point in path_repeat]
            priv_lngs = [point["private"]["longitude"] for point in path_repeat]
            
            # Plot the first path with labels, others without
            if path_repeat == path_results[0]:
                plt.plot(orig_lngs, orig_lats, 'o-', color='orange', label='Path (Original)')
                plt.plot(priv_lngs, priv_lats, 'x-', color='orange', label='Path (Private)')
            else:
                plt.plot(orig_lngs, orig_lats, 'o-', color='orange', alpha=0.3)
                plt.plot(priv_lngs, priv_lats, 'x-', color='orange', alpha=0.3)
    
    plt.title('GeoGuard Location Privacy Testing Results')
    plt.xlabel('Longitude')
    plt.ylabel('Latitude')
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    
    plt.savefig('geoguard_test_results.png')
    print("Visualization saved to geoguard_test_results.png")
    
    # Plot privacy level vs. distance offset
    plt.figure(figsize=(10, 6))
    
    privacy_levels = []
    distances = []
    scenario_colors = []
    
    for result in static_results:
        if "approximate_distance_meters" in result:
            privacy_levels.append(result["privacy_level"])
            distances.append(result["approximate_distance_meters"])
            scenario_colors.append(colors[result["scenario"]])
    
    plt.scatter(privacy_levels, distances, c=scenario_colors, alpha=0.7)
    
    # Add trend line
    z = np.polyfit(privacy_levels, distances, 1)
    p = np.poly1d(z)
    plt.plot(range(1, 11), p(range(1, 11)), "r--", alpha=0.7)
    
    plt.title('Privacy Level vs. Distance Offset')
    plt.xlabel('Privacy Level')
    plt.ylabel('Approximate Distance Offset (meters)')
    plt.grid(True)
    
    # Add legend
    for scenario_name, color in colors.items():
        plt.scatter([], [], color=color, label=scenario_name)
    plt.legend()
    
    plt.savefig('privacy_level_vs_distance.png')
    print("Privacy analysis saved to privacy_level_vs_distance.png")

# Save results to a file
def save_results(history, results):
    if not SAVE_RESULTS:
        return
        
    output = {
        "test_timestamp": datetime.now().isoformat(),
        "history_size": len(history),
        "test_results": results
    }
    
    with open('geoguard_test_results.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print("Results saved to geoguard_test_results.json")

# Main test function
def run_tests():
    print("Starting GeoGuard API tests...")
    
    try:
        # Check if API is running
        response = requests.get(f"{API_URL}/protect_location")
        if response.status_code != 405:  # Expect Method Not Allowed for GET on a POST endpoint
            print(f"Warning: Unexpected response from API: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print(f"Error: Cannot connect to GeoGuard API at {API_URL}")
        print("Please make sure the GeoGuard backend server is running.")
        return
    
    # Generate and load history
    history = generate_location_history()
    if not test_load_history(history):
        print("Failed to load history. Tests aborted.")
        return
    
    # Test protecting locations
    results = test_protect_locations()
    
    # Save and visualize results
    save_results(history, results)
    visualize_results(history, results)
    
    print("All tests completed!")

if __name__ == "__main__":
    run_tests()