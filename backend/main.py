import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from collections import defaultdict
import json
import datetime
import hashlib
import random
import math
import os

class GeoGuardPrivacy:
    def __init__(self, history_file=None, sensitivity_radius=100, poi_threshold=5):
        """
        Initialize the GeoGuard privacy system.
        
        Args:
            history_file: Optional file containing location history
            sensitivity_radius: Radius (in meters) for considering points as sensitive
            poi_threshold: Number of visits to consider a location as a Point of Interest
        """
        self.location_history = []
        self.clusters = None
        self.pois = []  # Points of Interest
        self.sensitivity_radius = sensitivity_radius
        self.poi_threshold = poi_threshold
        self.creation_time = datetime.datetime.now().isoformat()
        
        # Create data directory if it doesn't exist
        os.makedirs('data', exist_ok=True)
        
        # Default history file if none provided
        self.history_file = history_file or 'data/location_history.json'
        
        # Try to load existing history
        if os.path.exists(self.history_file):
            self.load_history(self.history_file)
    
    def load_history(self, file_path):
        """Load location history from a JSON file."""
        try:
            with open(file_path, 'r') as f:
                self.location_history = json.load(f)
            self._analyze_history()
            print(f"Loaded {len(self.location_history)} location points from history")
        except Exception as e:
            print(f"Error loading history: {e}")
    
    def add_location(self, lat, lng, timestamp=None):
        """Add a new location point to the history."""
        if timestamp is None:
            timestamp = datetime.datetime.now().isoformat()
        
        location = {
            "latitude": lat,
            "longitude": lng,
            "timestamp": timestamp
        }
        
        self.location_history.append(location)
        
        # Re-analyze if we have sufficient new data points
        if len(self.location_history) % 10 == 0:
            self._analyze_history()
            # Auto-save history periodically
            self.save_history(self.history_file)
    
    def _analyze_history(self):
        """Analyze location history to identify clusters and points of interest."""
        if len(self.location_history) < 10:
            return
        
        try:
            # Extract coordinates
            coords = np.array([[loc["latitude"], loc["longitude"]] 
                             for loc in self.location_history])
            
            # Normalize the data
            X = StandardScaler().fit_transform(coords)
            
            # Perform clustering
            db = DBSCAN(eps=0.1, min_samples=3).fit(X)
            labels = db.labels_
            
            # Count points in each cluster
            cluster_counts = defaultdict(int)
            for label in labels:
                cluster_counts[label] += 1
            
            # Find cluster centers
            self.clusters = []
            for label in set(labels):
                if label == -1:  # Skip noise points
                    continue
                    
                cluster_points = coords[labels == label]
                center = np.mean(cluster_points, axis=0)
                
                self.clusters.append({
                    "center": (center[0], center[1]),
                    "count": cluster_counts[label],
                    "radius": self._calculate_cluster_radius(cluster_points, center)
                })
            
            # Identify points of interest (frequently visited locations)
            self.pois = [cluster for cluster in self.clusters 
                        if cluster["count"] >= self.poi_threshold]
                        
            print(f"Analysis complete: {len(self.clusters)} clusters, {len(self.pois)} POIs")
        except Exception as e:
            print(f"Error during history analysis: {e}")
    
    def _calculate_cluster_radius(self, points, center):
        """Calculate the radius of a cluster based on distance from center to farthest point."""
        if len(points) == 0:
            return 0
            
        distances = [self._haversine(center[0], center[1], p[0], p[1]) for p in points]
        return max(distances) if distances else 0
    
    def _haversine(self, lat1, lon1, lat2, lon2):
        """Calculate the great circle distance between two points in meters."""
        # Convert decimal degrees to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        r = 6371000  # Radius of earth in meters
        return c * r
    
    def is_sensitive_location(self, lat, lng):
        """Determine if a location is sensitive (near a POI)."""
        for poi in self.pois:
            center_lat, center_lng = poi["center"]
            distance = self._haversine(lat, lng, center_lat, center_lng)
            if distance <= self.sensitivity_radius:
                return True, poi
        return False, None
    
    def get_privacy_preserving_location(self, actual_lat, actual_lng, privacy_level=None):
        """
        Generate a privacy-preserving location based on the actual location.
        
        Args:
            actual_lat: Actual latitude
            actual_lng: Actual longitude
            privacy_level: Optional manual privacy level (1-10, higher = more private)
            
        Returns:
            Tuple of (latitude, longitude) for the privacy-preserving location
        """
        # Check if this is a sensitive location
        is_sensitive, poi = self.is_sensitive_location(actual_lat, actual_lng)
        
        # Always ensure sensitive locations get at least level 8 protection
        if is_sensitive and (privacy_level is None or privacy_level < 8):
            privacy_level = 8
        
        # Find the appropriate cluster if it exists
        cluster = None
        if self.clusters:
            min_distance = float('inf')
            for c in self.clusters:
                center_lat, center_lng = c["center"]
                distance = self._haversine(actual_lat, actual_lng, center_lat, center_lng)
                if distance < min_distance:
                    min_distance = distance
                    cluster = c
        
        # Generate surrogate location based on privacy level and cluster
        if cluster and privacy_level < 7:
            # Within cluster, preserve relative distances
            center_lat, center_lng = cluster["center"]
            angle = random.uniform(0, 2 * math.pi)
            
            # Scale the distance based on privacy level (higher = more noise)
            noise_factor = privacy_level / 10.0
            radius = cluster["radius"] * noise_factor
            
            # Add noise within the cluster's general area
            lat_offset = (radius / 111111) * math.cos(angle)
            lng_offset = (radius / (111111 * math.cos(math.radians(center_lat)))) * math.sin(angle)
            
            return center_lat + lat_offset, center_lng + lng_offset
        else:
            # Higher privacy or no cluster: create a more significant offset
            # Use hash of location to make surrogate locations stable for the same input
            location_hash = hashlib.md5(f"{actual_lat},{actual_lng}".encode()).hexdigest()
            hash_value = int(location_hash, 16)
            random.seed(hash_value)
            
            # Calculate offset distance based on privacy level (50-500 meters)
            offset_distance = privacy_level * 50
            
            # Generate random angle and apply offset
            angle = random.uniform(0, 2 * math.pi)
            lat_offset = (offset_distance / 111111) * math.cos(angle)
            lng_offset = (offset_distance / (111111 * math.cos(math.radians(actual_lat)))) * math.sin(angle)
            
            return actual_lat + lat_offset, actual_lng + lng_offset
    
    def save_history(self, file_path=None):
        """Save current location history to a file."""
        if file_path is None:
            file_path = self.history_file
            
        try:
            with open(file_path, 'w') as f:
                json.dump(self.location_history, f)
            print(f"Saved {len(self.location_history)} location points to {file_path}")
            return True
        except Exception as e:
            print(f"Error saving history: {e}")
            return False

# API server for the Chrome extension to connect to
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # This enables CORS for all routes

# Create data directory if it doesn't exist
os.makedirs('data', exist_ok=True)

# Initialize the GeoGuard privacy system
geo_guard = GeoGuardPrivacy(history_file='data/location_history.json')

@app.route('/protect_location', methods=['POST'])
def protect_location():
    try:
        data = request.get_json()
        
        if not data or 'latitude' not in data or 'longitude' not in data:
            return jsonify({"error": "Missing location data"}), 400
        
        # Extract location data
        lat = float(data['latitude'])
        lng = float(data['longitude'])
        
        # Optional privacy level
        privacy_level = int(data.get('privacy_level', 5))
        
        # Add to history if requested
        if data.get('save_history', False):
            geo_guard.add_location(lat, lng)
        
        # Generate private location
        private_lat, private_lng = geo_guard.get_privacy_preserving_location(lat, lng, privacy_level)
        
        # Check if this was a sensitive location
        is_sensitive, _ = geo_guard.is_sensitive_location(lat, lng)
        
        return jsonify({
            "original": {"latitude": lat, "longitude": lng},
            "private": {"latitude": private_lat, "longitude": private_lng},
            "is_sensitive": is_sensitive,
            "privacy_level": privacy_level
        })
    except Exception as e:
        print(f"Error in protect_location: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/load_history', methods=['POST'])
def load_history():
    try:
        data = request.get_json()
        
        if not data or 'history' not in data:
            return jsonify({"error": "No history provided"}), 400
        
        # Replace current history with provided data
        geo_guard.location_history = data['history']
        geo_guard._analyze_history()
        
        # Optionally save the new history to disk
        if data.get('save_to_disk', False):
            geo_guard.save_history()
        
        return jsonify({
            "status": "success", 
            "clusters": len(geo_guard.clusters), 
            "pois": len(geo_guard.pois),
            "locations": len(geo_guard.location_history)
        })
    except Exception as e:
        print(f"Error in load_history: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/status', methods=['GET'])
def status():
    return jsonify({
        "status": "online",
        "version": "1.0.0",
        "pois": len(geo_guard.pois),
        "clusters": len(geo_guard.clusters),
        "locations": len(geo_guard.location_history),
        "creation_time": geo_guard.creation_time
    })

@app.route('/clear_history', methods=['POST'])
def clear_history():
    try:
        data = request.get_json()
        
        if not data or not data.get('confirm', False):
            return jsonify({"error": "Confirmation required"}), 400
        
        # Clear history
        geo_guard.location_history = []
        geo_guard.clusters = []
        geo_guard.pois = []
        
        # Save empty history to disk
        geo_guard.save_history()
        
        return jsonify({"status": "success", "message": "History cleared"})
    except Exception as e:
        print(f"Error in clear_history: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/save_history', methods=['POST'])
def save_history_endpoint():
    try:
        success = geo_guard.save_history()
        if success:
            return jsonify({"status": "success", "message": "History saved to disk"})
        else:
            return jsonify({"error": "Failed to save history"}), 500
    except Exception as e:
        print(f"Error in save_history: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    try:
        print("Starting GeoGuard Privacy Server...")
        # Use a safer way to print these values
        pois_count = len(geo_guard.pois) if geo_guard.pois is not None else 0
        clusters_count = len(geo_guard.clusters) if geo_guard.clusters is not None else 0
        locations_count = len(geo_guard.location_history) if geo_guard.location_history is not None else 0
        print(f"POIs: {pois_count}, Clusters: {clusters_count}, Locations: {locations_count}")
        app.run(host='127.0.0.1', port=5000)
    except Exception as e:
        print(f"Error starting server: {e}")