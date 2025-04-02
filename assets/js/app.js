// Provide access token for Cesium Ion
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmNzRmZDQ5MS0zODY1LTRjYjEtOGI3Ny0wZGMwNWQ1MjVhOGMiLCJpZCI6MjI1Mjg3LCJpYXQiOjE3MjA0NTM1NzV9.k5jpBA4KmrErsokf_kxNKNcYbE8tNwCavyzJNRQOFeQ';

// Initialize the Cesium viewer with customized settings
const viewer = new Cesium.Viewer('cesiumContainer', {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});
viewer.scene.globe.enableLighting = true;

// Configure scene to reduce render artifacts with transparent objects
viewer.scene.globe.depthTestAgainstTerrain = true;
viewer.scene.logarithmicDepthBuffer = false;
viewer.scene.postProcessStages.fxaa.enabled = true;
viewer.scene.highDynamicRange = false;

// Declare global variables
let flightData = [];
let start, stop, timeStepInSeconds;
let sampledPositionProperty;

/**
 * @brief Min and max data analysis helper functions  
 * 
 * Calculates and returns the min and max height, longitude, and latitude 
 * from the flight data.
 * 
 * @param {*} data 
 * @returns Min and max height, longitude, and latitude
 */
function analyzeFlightData(data) {
  return {
    height: {
      min: Math.min(...data.map(d => parseFloat(d.height))), 
      max: Math.max(...data.map(d => parseFloat(d.height)))   
    },
    coordinates: {
      longitude: {
        min: Math.min(...data.map(d => parseFloat(d.longitude))),
        max: Math.max(...data.map(d => parseFloat(d.longitude)))
      },
      latitude: {
        min: Math.min(...data.map(d => parseFloat(d.latitude))),
        max: Math.max(...data.map(d => parseFloat(d.latitude)))
      }
    }
  };
}

// Update getCurrentAtmosphereLayer to include only lower layers  
function getCurrentAtmosphereLayer(height, flightStats) {
  const heightInKm = height;  // Height is already in kilometers
  
  if (heightInKm < 11) return 'Troposphere (0-36,000ft)';
  if (heightInKm < 12) return 'Tropopause (36,000-39,000ft)';
  if (heightInKm < 20) return 'Lower Stratosphere (39,000-65,600ft)';
  if (heightInKm < 30) return 'Ozone Layer (65,600-98,400ft)';
  return 'Upper Stratosphere (98,400-164,000ft)';
}

// Initialize the viewer's clock 
function setClockFromData() {
  const times = flightData.map(dp => Cesium.JulianDate.fromIso8601(dp.timestamp));
  
  // Determine the earliest and latest times in data (start & stop)
  start = times.reduce((min, t) => Cesium.JulianDate.lessThan(t, min) ? t : min, times[0]);
  stop = times.reduce((max, t) => Cesium.JulianDate.greaterThan(t, max) ? t : max, times[0]);
  viewer.clock.startTime = Cesium.JulianDate.clone(start);
  viewer.clock.stopTime = Cesium.JulianDate.clone(stop);
  viewer.clock.currentTime = Cesium.JulianDate.clone(start);

  viewer.timeline.zoomTo(start, stop);
  viewer.clock.shouldAnimate = true;
}

// Update createFlight to improve layer labeling  
function createFlight() {
  sampledPositionProperty = new Cesium.SampledPositionProperty();

  // Analyze flight data for dynamic ranges
  const flightStats = analyzeFlightData(flightData);

  // Iterate through the flight data and add samples to the position property
  for (let i = 0; i < flightData.length; i++) {
    const dataPoint = flightData[i];
    
    // Calculate speed if we have a previous position
    let speed = 0;
    if (i > 0) {
      const prevPoint = flightData[i - 1];
      const prevTime = new Date(prevPoint.timestamp).getTime();
      const currentTime = new Date(dataPoint.timestamp).getTime();
      const timeDiff = (currentTime - prevTime) / 1000; // Convert to seconds
      
      // Calculate distance between points
      const prevPos = Cesium.Cartesian3.fromDegrees(
        parseFloat(prevPoint.longitude),
        parseFloat(prevPoint.latitude),
        parseFloat(prevPoint.height)
      );
      const currentPos = Cesium.Cartesian3.fromDegrees(
        parseFloat(dataPoint.longitude),
        parseFloat(dataPoint.latitude),
        parseFloat(dataPoint.height)
      );
      const distance = Cesium.Cartesian3.distance(prevPos, currentPos);
      speed = (distance / timeDiff) * 3.6; // Convert to km/h
    }
  
    // Update the time and position for each data point
    const time = Cesium.JulianDate.fromIso8601(dataPoint.timestamp);
    const position = Cesium.Cartesian3.fromDegrees(
      parseFloat(dataPoint.longitude), 
      parseFloat(dataPoint.latitude), 
      parseFloat(dataPoint.height) 
    );
    sampledPositionProperty.addSample(time, position);

    // Update description to use correct layer calculation
    let description = `
    <strong>Longitude:</strong> ${dataPoint.longitude}°</br>
    <strong>Latitude:</strong> ${dataPoint.latitude}°</br>
    <strong>Height:</strong> ${(dataPoint.height * 3.28084).toFixed(2)} ft</br>
    <strong>Speed:</strong> ${speed.toFixed(2)} km/h</br>
    <strong>Layer:</strong> ${getCurrentAtmosphereLayer(parseFloat(dataPoint.height) / 1000, flightStats)}</br>
    <strong>Time:</strong> ${dataPoint.timestamp}</br>`;
  
    // Create a point entity for each data point with color based on speed
    const pointColor = getColorBasedOnSpeed(speed);
    viewer.entities.add({
      name: "Flight Data Point",
      description: description,
      position: position,
      point: { 
        pixelSize: 10, 
        color: pointColor,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2
      }
    });
  }
}

// Helper function to get color based on speed  
function getColorBasedOnSpeed(speed) {
  if (speed === 0) return Cesium.Color.BLUE.withAlpha(0.8);
  if (speed < 50) return Cesium.Color.GREEN.withAlpha(0.8);
  if (speed < 100) return Cesium.Color.YELLOW.withAlpha(0.8);
  return Cesium.Color.RED.withAlpha(0.8);
}

// Create the main flight entity that uses the sampled positions
function createEntity() {
  const payloadEntity = viewer.entities.add({
    availability: new Cesium.TimeIntervalCollection([ 
      new Cesium.TimeInterval({ start: start, stop: stop }) 
    ]),
    position: sampledPositionProperty,
    name: 'ASU ASCEND Payload',
    billboard: {
      image: '../../media/projects/ascend/payload.png',
      width: 150,
      height: 150,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM
    },
    path: new Cesium.PathGraphics({ width: 2 })
  });
  // Make the camera track this moving entity.
  viewer.trackedEntity = payloadEntity;
}

// Load JSON data from the aprs-data-fall-2024.json file and initialize everything
async function init() {
  try {
    const response = await fetch(`../../data/aprs-data.json`);
    flightData = await response.json();
    console.log(flightData);
    
    // Set the clock
    setClockFromData();

    // Create flight entities and sample the positions
    createFlight();

    // Create the main flight entity that uses the sampled positions
    createEntity();

  } catch (error) {
    console.error('Error loading JSON data:', error);
  }
}

// Call main function to initialize the viewer
init();