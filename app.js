// ----- CONFIG -----
let allAsteroids = []; // Store all fetched asteroids here
let pinEntity = null; // Entity for the pinned location
let zoneEntities = []; // Store zone entities here (red, orange, yellow)
let selectedEntities = []; //Store selected asteroid and pin location here
const asteroidElements = new Map();
let viewer;
let asteroidListEl, refreshBtn, clearBtn;


//------- API KEYS (put your keys here) --------
const NASA_API_KEY = "ZVfdi6M1lgDj8dJ8BVJO3gwKsvqDYXSEAhDFiLba";

const CESIUM_ION_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyNTlkNThhZS1kMzc3LTQzZTItYTE2Yi05YmQzM2FjNTM3ODIiLCJpZCI6MzQwNDY3LCJpYXQiOjE3NTgyNjY2ODd9.qE9C08PchdzqTkBDhIr_zkPS2Gw2a8LELq1SbA8R4W4"; // put your token here
Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN

console.log("Using Cesium Token:", Cesium.Ion.defaultAccessToken);
;

const EARTH_RADIUS_METERS = 63710000; // 6,371,000 meters
//------- SIMPLE CESIUM SETUP (no heavy terrain to avoid token-scope issues) --------
window.onload = function() {
  Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

  viewer = new Cesium.Viewer("cesiumContainer", {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: true,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: false
  });

  viewer.imageryLayers.removeAll();

  
  Cesium.IonImageryProvider.fromAssetId(2)
    .then(function(imageryProvider) {
      viewer.imageryLayers.addImageryProvider(imageryProvider);
      console.log("✅ Cesium imagery provider added");
    })
    .catch(function(error) {
      console.error("❌ Failed to load Cesium imagery provider", error);
    });

viewer.scene.screenSpaceCameraController.minimumZoomDistance = 10;
viewer.scene.screenSpaceCameraController.maximumZoomDistance = 1e9;
viewer.scene.screenSpaceCameraController.enableZoom = true;
viewer.scene.screenSpaceCameraController.enableRotate = true;
viewer.scene.screenSpaceCameraController.enableTilt = true;
viewer.scene.screenSpaceCameraController.minimumPitch = -Cesium.Math.PI_OVER_TWO;
viewer.scene.screenSpaceCameraController.maximumPitch = Cesium.Math.PI_OVER_TWO;



  asteroidListEl = document.getElementById("asteroidList");
refreshBtn = document.getElementById("refreshBtn");
if (refreshBtn) {
  refreshBtn.addEventListener("click", fetchAsteroidData); // Only once
} else {
  console.error("refreshBtn element not found");
}

clearBtn = document.getElementById("clr-button");
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    // Clear pin list
    selectedEntities = [];
    console.log("Cleared selected entities:", selectedEntities);
    if (pinEntity) {
      viewer.entities.remove(pinEntity);
      pinEntity = null;
    }
    

    zoneEntities.forEach(entity => viewer.entities.remove(entity));
    zoneEntities = [];

    for (const item of asteroidElements.values()) {
      const detailsEl = item.querySelector('.impact-details');
      if (detailsEl) {
        detailsEl.style.display = 'none';
        detailsEl.innerHTML = '';
      }
    }

    console.log("Cleared pin and zones from the globe.");
  });
} else {
  console.error("clearBtn element not found");
}
const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
  handler.setInputAction(function (click) {
    const pickedLocation = viewer.scene.pickPosition(click.position);

    if (Cesium.defined(pickedLocation)) {
      const cartographic = Cesium.Cartographic.fromCartesian(pickedLocation);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);
      const lon = Cesium.Math.toDegrees(cartographic.longitude);

      if (selectedEntities.some(e => e.type === "Pin Location")) {
        alert("You already selected a location. Please clear before selecting a new location.");
        return;
      }

      if (pinEntity) {
        viewer.entities.remove(pinEntity);
      }

      pinEntity = viewer.entities.add({
position: Cesium.Cartesian3.fromDegrees(lon, lat),
        label: {
          text: "📍",
          font: "40px sans-serif",
          fillColor: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        }
      });

      selectedEntities = selectedEntities.filter(e => e.type !== "Pin Location");
      selectedEntities.push({ type: "Pin Location", lat, lon });

      console.log("Selected Entities:", selectedEntities);

      waitTodrawImpactZones();
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  
}; // End of window.onload
  


//--------------ASTEROID DATA FETCHING TO ADD TO THE DROP DOWN LIST-------------

async function fetchAsteroidData() {
  // Dynamically Setting dates for the API call 
  const today = new Date();
  const startDate = today.toISOString().split("T")[0];
  const end = new Date(today);
  end.setDate(today.getDate() + 7);
  const endDate = end.toISOString().split("T")[0];

  const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${NASA_API_KEY}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();

    console.log("✅ API Data:", data); // Log the entire data for inspection 

    // Clear old list
    asteroidListEl.innerHTML = ""; //prevents duplication/build up of old data

    // Loop through dates
    for (const date in data.near_earth_objects) {
      const asteroids = data.near_earth_objects[date]; //create a temporary array to store elements of each date

    //Loop through each asteroid on that date and create a new div element to store the data
      asteroids.forEach(asteroid => {
        const asteroidId = asteroid.id;
        const asteroidName = asteroid.name;
        const asteroidDiameter = asteroid.estimated_diameter.meters.estimated_diameter_max.toFixed(2);
        const asteroidVelocity = parseFloat(asteroid.close_approach_data[0].relative_velocity.kilometers_per_hour).toFixed(2);
        const asteroidMissDistance = parseFloat(asteroid.close_approach_data[0].miss_distance.kilometers).toFixed(2);
        const asteroidHazardous = asteroid.is_potentially_hazardous_asteroid;

        const asteroidData = {
          id: asteroid.id,
          name: asteroidName,
          diameter: parseFloat(asteroidDiameter),
          velocity: parseFloat(asteroidVelocity),
          missDistance: parseFloat(asteroidMissDistance),
          hazardous: asteroidHazardous
        };

        allAsteroids.push(asteroidData); // Add to the main array

        const item = document.createElement("div");
        item.dataset.asteroidId = asteroid.id;
        item.className = "asteroid-item";

        item.innerHTML = `
          <div class = "detail-container">
            <strong>Name:</strong> ${asteroidName} <br>
            <strong>Diameter:</strong> ${asteroidDiameter} m <br>
            <strong>Velocity:</strong> ${asteroidVelocity} km/h <br>
            <strong>Miss Distance:</strong> ${asteroidMissDistance} km <br>
            <span class="badge" style="color:${asteroidHazardous ? "red" : "lime"}">
              ${asteroidHazardous ? "⚠️ Hazardous" : "✅ Safe"}
            </span>

            <div class="impact-details" style="display:none; margin-top:8px;"></div>

          </div>
          
          

          `;

        item.addEventListener("click", () => {
          
          handleAsteroidClick(asteroid.id);
          console.log("Function is called with asteroid ID:", asteroid.id);
          // You can add more functionality here to highlight the asteroid on the globe
        });

        asteroidListEl.appendChild(item); //appending each item to the asteroid list element
        asteroidElements.set(asteroidId, item);

      
      });
    }
  } catch (err) {
    console.error("❌ Failed to fetch asteroid data", err);
  }
}


async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json();
    return j.display_name || null;
  } catch (err) {
    console.warn("Reverse geocode failed:", err);
    return null;
  }
}


//Event Listeners 
//listens to the refresh button and fetches new data when clicked



//Functions which are called in the event listeners or in each other lol

//function to handle clicking on an asteroid from the list
function handleAsteroidClick(asteroidId) {
  //Limit user to selecting one asteroid at a time 
  if (selectedEntities.some(e => e.type === "asteroid")) {
    alert("You already selected an asteroid. Please clear before selecting a new asteroid.");
    return;
  }

  const asteroid = allAsteroids.find(a => a.id === asteroidId);
  if (!asteroid) {
    console.error("Asteroid not found:", asteroidId);
    return;
  }

  selectedAsteroid = asteroid;
  selectedEntities = selectedEntities.filter(e => e.type !== "asteroid");
  selectedEntities.push({ type: "asteroid", data: asteroid });

  // after you add to selectedEntities
const item = asteroidElements.get(asteroid.id);
if (item) {
  const location = selectedEntities.find(e => e.type === "Pin Location");
  if (location) {
    // we have both — show full impact details (async)
    showImpactDetailsForAsteroid(item, asteroid, location);
  } else {
    // show pending state explaining to pin a location
    showPendingDetails(item, asteroid);
  }
}


  console.log("Selected Asteroid:", selectedAsteroid);
  
  waitTodrawImpactZones();
}

//--------- IMPACT ZONE CALCULATION AND DRAWING ----------

function waitTodrawImpactZones() {
  const asteroid = selectedEntities.find(e => e.type === "asteroid");
  const location = selectedEntities.find(e => e.type === "Pin Location");

  if (asteroid && location) {
    console.log("✅ Ready to draw impact zones at:", location.lat, location.lon);
    console.log("With asteroid data:", asteroid.data);

    drawImpactZones();

  } else {
    console.log("⏳ Waiting for both asteroid and location selection...");
  }
}




//--------- HELPER FUNCTIONS (MATHEMATICS AND PHYSICS) ----------

function showPendingDetails(item, asteroidData) {
  const detailsEl = item.querySelector('.impact-details');
  try {
    const ke = calculateKineticEnergy({ data: asteroidData }); // wrapper shape
    const kt = energyToKiloTons(ke);
    detailsEl.innerHTML = `
      <div>
        <strong>Estimated Kinetic Energy:</strong> ${ke.toExponential(3)} J<br>
        <strong>Estimated yield:</strong> ${kt.toFixed(2)} kt TNT<br>
        <em>Pin a location on the globe to compute impact radii & effects.</em>
      </div>
    `;
  } catch (e) {
    detailsEl.innerHTML = `<div><em>Insufficient asteroid data to compute energy.</em></div>`;
  }
  detailsEl.style.display = 'block';
}


async function showImpactDetailsForAsteroid(item, asteroidData, location) {
  const detailsEl = item.querySelector('.impact-details');
  detailsEl.style.display = 'block';
  detailsEl.innerHTML = `<em>Calculating impact details…</em>`;

  // 1) compute KE and yield
  let KE;
  try {
    KE = calculateKineticEnergy({ data: asteroidData }); // your helper expects asteroid.data
  } catch (err) {
    detailsEl.innerHTML = `<div><strong>Error:</strong> Cannot compute energy.</div>`;
    return;
  }
  const kt = energyToKiloTons(KE); // your helper returns kt

  // 2) compute radii using your existing function
  const radii = energyToImpactRadius(KE); // returns { yeildKilotons, redRadius, ... }

  // 3) reverse geocode location (best effort)
  let placeName = "Unknown location";
  const maybeName = await reverseGeocode(location.lat, location.lon);
  if (maybeName) placeName = maybeName;

  // 4) Build display HTML (tweak labels as you like)
  const html = `
    <div>
      <strong>Location:</strong> ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}<br>
      <strong>Location name:</strong> ${placeName} <br><br>

      <strong>Kinetic Energy:</strong> ${KE.toExponential(3)} J<br>
      <strong>Estimated yield:</strong> ${kt.toFixed(2)} kt TNT<br><br>

      <strong>Impact radii (meters):</strong><br>
      <ul style="margin:0; padding-left:18px;">
        <li><strong>Red (≈20 psi):</strong> ${(radii.redRadius).toFixed(0)} m (${(radii.redRadius/1000).toFixed(2)} km)</li>
        <li><strong>Orange (≈5 psi):</strong> ${(radii.orangeRadius).toFixed(0)} m (${(radii.orangeRadius/1000).toFixed(2)} km)</li>
        <li><strong>Yellow (≈1 psi):</strong> ${(radii.yellowRadius).toFixed(0)} m (${(radii.yellowRadius/1000).toFixed(2)} km)</li>
      </ul>
    </div>
  `;
  detailsEl.innerHTML = html;
}


//1. Calculate Kinetic Energy (in Joules)
function calculateKineticEnergy(asteroid) {
  const diameter = asteroid.data.diameter;
  const radius = diameter / 2; // in meters
  const volume = (4/3) * Math.PI * Math.pow(radius, 3);

  const density = 3000; // Assumed desnsity in kg/m^3 (average density of rocky asteroids)
  const mass = density * volume; // in kg
  const velocity = asteroid.data.velocity / 3.6; // Convert km/h to m/s

  //kinetic energy formula: KE = 0.5 * m * v^2
  const kineticEnergy = 0.5 * mass * Math.pow(velocity, 2); // in Joules
  return kineticEnergy; // in Joules
}


//2. Convert Kinetic Energy to Magnitude (Mw)
function energyToKiloTons(E_joules) {
  const E_kilotons = E_joules / 4.184e12; // 1 kiloton of TNT = 4.184e12 Joules
  return E_kilotons;
}




//3. Cube root scaling for impact radius estimation
//cube root scaling for impact radius estimation
//Reference distances for a kiloton yeild (meters), taken from
//standard Glassstone/Dolan/ Earth impact tables then scaled by yeild^(1/3)
//reference for 1kt yeild
const referenceRadii_1kt = {
  psi20: 200, //0.20 km (near total destruction)
  psi5: 600, //0.60 km (severe damage/ most buildings collapse)
  psi1: 1700, //1.70 km (moderate damage/ window shattering)
};


//4. Estimate Impact Radii from Energy
//translate energy to impact radius
function energyToImpactRadius(energyJoules) {
  const ykt = Math.max(energyToKiloTons(energyJoules), 0.001); //in kilotons, min 1 ton

  //avoid division by zero
  const effY = Math.max(ykt, 1e-12);

  const scale = (r1kt) => r1kt * Math.pow(effY, 1/3);

  let redRadius = scale(referenceRadii_1kt.psi20);
  let orangeRadius = scale(referenceRadii_1kt.psi5);
  let yellowRadius = scale(referenceRadii_1kt.psi1);


  return { 
    yeildKilotons: ykt,
    redRadius,
    orangeRadius,
    yellowRadius 
  };
}


//--------- DRAWING THE IMPACT ZONES ----------


function addZone(lat, lon, radius, color) {
  const entity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat),
    ellipse: {
      semiMinorAxis: radius,
      semiMajorAxis: radius,
      material: color.withAlpha(0.3),
      height: 0,
      outline: true,
      outlineColor: color,
      outlineWidth: 2
    }
  });
  zoneEntities.push(entity);
}



function drawImpactZones() {
  //clear old zones
  zoneEntities.forEach(entity => viewer.entities.remove(entity));
  zoneEntities = [];

  const asteroid = selectedEntities.find(e => e.type === "asteroid");
  const location = selectedEntities.find(e => e.type === "Pin Location");

  console.log("Drawing impact zones at: ", location.lat, location.lon);
  console.log("With asteroid data: ", selectedAsteroid);

  //continue here with the draw logic

  //st1: Use KE
  const kineticEnergy = calculateKineticEnergy(asteroid);
  console.log("Calculated Kinetic Energy (Joules):", kineticEnergy);

  const {yeildKilotons, redRadius, orangeRadius, yellowRadius} = energyToImpactRadius(kineticEnergy);


  console.log(`Estimated Yeild: ${yeildKilotons.toFixed(2)} kt`);
  console.log(`Impact Radii (meters): Red: ${redRadius.toFixed(2)}, Orange: ${orangeRadius.toFixed(2)}, Yellow: ${yellowRadius.toFixed(2)}`);


  //st4: Draw Zones 
  addZone(location.lat, location.lon, redRadius, Cesium.Color.RED);
  addZone(location.lat, location.lon, orangeRadius, Cesium.Color.ORANGE);
  addZone(location.lat, location.lon, yellowRadius, Cesium.Color.YELLOW);

  // update the UI card for the selected asteroid (if present)
  const asteroidEntry = selectedEntities.find(e => e.type === "asteroid");
  if (asteroidEntry) {
    const item = asteroidElements.get(asteroidEntry.data.id);
    const location = selectedEntities.find(e => e.type === "Pin Location");
  if (item && location) {
    // call async but do not block UI
    showImpactDetailsForAsteroid(item, asteroidEntry.data, location);
  }
}





  console.log("✅ Impact zones drawn on the globe.");

}











