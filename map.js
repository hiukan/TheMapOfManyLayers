const imageWidth = 16695;
const imageHeight = 9555;

// Define map bounds based on image size
const imageBounds = [[0, 0], [imageHeight, imageWidth]];

// Calculate center point of the map
const center = [imageHeight / 2, imageWidth / 2];

function addLegend(map) {
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "info legend");
    const types = [
      "City", "Town", "Fortress", "Capital", "Ruins",
      "Road", "Track", "River", "Subterranean River",
      "Country", "Low Mountains", "High Mountains", "Hills",
      "Cliffs", "Cleared", "Grasslands", "Forest", "Jungle",
      "Marsh", "Swamp", "Moor", "Barren", "Volcano",
      "Glacier", "Sandy Desert", "Rocky Desert"
    ];

    types.forEach(type => {
      const color = getColorByType(type);
      div.innerHTML += `
        <i style="background:${color}; width: 18px; height: 18px; display: inline-block; margin-right: 8px;"></i>
        ${type}<br>
      `;
    });

    return div;
  };

  legend.addTo(map);
}

// === Filter control ===
function createLayerGroups(data) {
  const groups = {};

  L.geoJSON(data, {
    onEachFeature: function (feature, layer) {
      const type = feature.properties.type || "Other";
      if (!groups[type]) groups[type] = L.layerGroup();
      layer.addTo(groups[type]);
    }
  });

  return groups;
}

// === Highlight on hover ===
function highlightOnHover(layer) {
  layer.on("mouseover", function (e) {
    layer.setStyle({ weight: 5, color: "#FFD700" });
  });
  layer.on("mouseout", function (e) {
    layer.setStyle({ weight: getWeightByType(layer.feature.properties.type), color: getColorByType(layer.feature.properties.type) });
  });
}

// === Map initialization ===
const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: -5,  // allow more zooming out
  maxZoom: 4,
  zoomSnap: 0.25,
  zoomDelta: 0.5,
  center: center,
  zoom: -3, // start zoomed out
  maxBounds: imageBounds, // prevent panning out of bounds
  maxBoundsViscosity: 1.0
});

/* var cityMarker = L.icon({
  iconUrl: 'city_icon.png',
  iconSize: [12,12],
  iconAnchor: [6,6],
  popupAnchor: [0, -24]
});

var ruinsMarker = L.icon({
  iconUrl: 'ruins_icon.png',
  iconSize: [24,24],
  iconAnchor: [12,12],
  popupAnchor: [0, -24]
}); 

// === Icons for cities, towns, etc ===
function getIconByType(type) {
  const iconUrl = {
    City: "icons/city.png",
    Town: "icons/town.png",
    Fortress: "icons/fortress.png",
    Ruins: "icons/ruins.png",
    Capital: "icons/capital.png"
  };

  if (iconUrl[type]) {
    return L.icon({
      iconUrl: iconUrl[type],
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24]
    });
  }
  return null;
}
*/

function getColorByType(type) {
  const colors = {
    // Points
    City: "#3498db",
    Town: "#2ecc71",
    Fortress: "#888888",
    Ruins: "#964B00",
    Capital: "#f1c40f",
    'Pirate Settlement': "#d42410ff",
    'Dwarven Settlement': "#8e44ad",

    // Lines
    Road: "#8B4513",
    Track: "#CD853F",
    River: "#1E90FF",
    "Subterranean River": "#4682B4",

    // Areas / Polygons
    Country: "#228B22",
    "Low Mountains": "#A9A9A9",
    "High Mountains": "#808080",
    Hills: "#BDB76B",
    Cliffs: "#8B0000",
    Cleared: "#CCCC99",
    Grasslands: "#7CFC00",
    Forest: "#006400",
    Jungle: "#228B22",
    Marsh: "#556B2F",
    Swamp: "#2E8B57",
    Moor: "#6B8E23",
    Barren: "#A0522D",
    Volcano: "#B22222",
    Glacier: "#87CEFA",
    "Sandy Desert": "#EDC9Af",
    "Rocky Desert": "#DEB887",

    default: "#000000"
  };
  return colors[type] || colors.default;
}

function getWeightByType(type) {
  if (type === "Road") return 3;
  if (type === "Track") return 2;
  if (type === "River" || type === "Subterranean River") return 2;
  return 1;
}


L.imageOverlay('forgotten_realms_map.png', imageBounds).addTo(map);
L.rectangle(imageBounds, {
  color: 'black',
  weight: 3,
  fill: false
}).addTo(map);

fetch('locations.geojson')
  .then(response => response.json())
  .then(data => {
    let overlayLayers = {};
    L.geoJSON(data, {
      pointToLayer: function (feature, latlng) {
        // Handle points
        return L.circleMarker(latlng, {
          radius: getRadiusByZoom(map.getZoom()), // set initial size
          fillColor: getColorByType(feature.properties.type),
          color: "#000",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        });
      },
      style: function (feature) {
        // Handle lines and polygons
        if (feature.geometry.type === "Point") return;
        const type = feature.properties.type;
        return {
          color: getColorByType(type),
          weight: getWeightByType(type),
          fillOpacity: 0.4,
          fillColor: getColorByType(type)
        };
      },
      onEachFeature: function (feature, layer) {
        let name = feature.properties.name || "Unknown";
        let type = feature.properties.type || "Unknown";
        let desc = feature.properties.description || "";
        layer.bindPopup(`<strong>${name}</strong><br>Type: ${type}<br>${desc}`);
        highlightOnHover(layer);

        // Add to overlay groups
        if (!overlayLayers[type]) overlayLayers[type] = L.layerGroup();
        layer.addTo(overlayLayers[type]);
      }
    }).addTo(map);

    // Add legend
    addLegend(map);

    // Add layer control
    L.control.layers(null, overlayLayers, { collapsed: false }).addTo(map);
  });


map.fitBounds(imageBounds);

// Create a feature group to store drawn items (like forests, roads, etc.)
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Initialize the Leaflet.draw control
const drawControl = new L.Control.Draw({
  edit: {
    featureGroup: drawnItems,
    remove: true
  },
  draw: {
    polygon: true,
    polyline: true,
    rectangle: true,
    circle: true,
    marker: true,
    circlemarker: false
  }
});
map.addControl(drawControl);


/* map.on('click', function (e) {
  const coords = [e.latlng.lng, e.latlng.lat]; // reversed for GeoJSON

  const type = document.getElementById("markerType").value;
  const marker = L.circleMarker(e.latlng, {
    radius: 6,
    fillColor: "#ff7800",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
  }).addTo(map).bindPopup(`${type}`);

    const newLandmark = {
      type: "Feature",
      properties: { type, name: "" },
      geometry: {
        type: "Point",
        coordinates: coords
      }
    }
  navigator.clipboard.writeText(JSON.stringify(newLandmark)).then(() => {
    console.log(`${JSON.stringify(newLandmark)} copied to clipboard`);
  }).catch(err => {
    console.error("Failed to copy coordinates: ", err);
  });
}); */

map.on(L.Draw.Event.CREATED, function (event) {
  const layer = event.layer;
  const type = document.getElementById("markerType").value;

  drawnItems.addLayer(layer); // Add to map layer

  const geojson = layer.toGeoJSON();

  geojson.properties = {
    type
  };

  // Copy to clipboard for easy pasting into GeoJSON file
  navigator.clipboard.writeText(JSON.stringify(geojson, null, 2))
    .then(() => {
      console.log("Copied to clipboard:", geojson);
    })
    .catch(err => console.error("Clipboard copy failed:", err));
});

// Function to define how big the points should be
function getRadiusByZoom(zoom) {
  // You can tweak these values however you like!
  /* if (zoom >= 16) return 12;
  if (zoom >= 14) return 8;
  if (zoom >= 12) return 6;
  return 4; */
  return (zoom+9) * 0.8;  // Try tweaking the multiplier
}

// On zoom, resize all circle markers
/* map.on('zoomend', () => {
  const zoom = map.getZoom();
  overlayLayers.eachLayer(layer => {
    if (layer.setRadius) {
      layer.setRadius(getRadiusByZoom(zoom));
    }
  });
}); */
