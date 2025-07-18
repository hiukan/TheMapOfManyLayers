const imageWidth = 16695;
const imageHeight = 9555;

// Define map bounds based on image size
const imageBounds = [[0, 0], [imageHeight, imageWidth]];

// Calculate center point of the map
const center = [imageHeight / 2, imageWidth / 2];

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

function getColorByType(type) {
  switch (type) {
    case 'City': return '#ff5733';
    case 'Fortress': return '#888';
    case 'Town': return '#2ecc71';
    // add more types here
    default: return '#3498db';
  }
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
    L.geoJSON(data, {
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 6,
          fillColor: getColorByType(feature.properties.type),
          color: "#000",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        });
      },
      onEachFeature: function (feature, layer) {
        let name = feature.properties.name || "Unknown";
        let type = feature.properties.type || "Unknown";
        let desc = feature.properties.description || "";
        layer.bindPopup(`<strong>${name}</strong><br>Type: ${type}<br>${desc}`);
      }
    }).addTo(map);
  });

map.fitBounds(imageBounds);

map.on('click', function (e) {
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
});

