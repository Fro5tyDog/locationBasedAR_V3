
// IDs to control the check every frame. 
let checkPlayerLocationID; // ID of the animationFrame that receives player location data.
let checkRelativePositionID; // ID of the animationFrame that receives the relative position between the player and the models.

// Array of Objecst that stores all model information (This prevents having to fetch the JSON multiple times)
let modelsArray = [];

// Synchronization flag to control access to the target object
let isUpdatingTarget = false;

// 1. Render all the models. 
// 2. Create Drop down containers with all the models
// 3. Create the start up functionality. 
async function initializeMyApp(){

    // 1.
    const modelRender = await renderModels();
    
    // 2.
    const dropdownRender = await createDropdownContainer();

    // 3.
    const startUpScreen = await createStartScreen();

}

// Step 1 --------------------------------
// Create models within a-frame
function renderModels(){
    return new Promise((resolve, reject) => {
        try{
            // Variables
            let scene = document.querySelector('a-scene');

            // fetch json to create models.
            fetch('./model_positions.json')
           .then(response => response.json())
           .then(data => {
                console.log('JSON loaded', data);
                createModels(data);
                renderModelVisibility();

                // resolve after models are created
                resolve(true);
            })
           .catch(error => {
                console.error('Error loading the JSON data:', error);
            });
  
            // Function to create each model from the json.
            function createModels(models){
                models.forEach(modelSeparated => {
                    let latitude = modelSeparated.location.lat;
                    let longitude = modelSeparated.location.lng;
                    let filePath = modelSeparated.filePath;
                    let visibilityRange = modelSeparated.visibilityRange;
                    let name = modelSeparated.name;

                    console.log(`Creating model for: ${name} at (${latitude}, ${longitude}) with visibility range [${visibilityRange.min}m - ${visibilityRange.max}m]`);    

                    // Create a new entity for each place
                    let model = document.createElement('a-entity');
                    model.setAttribute('gps-entity-place', `latitude: ${latitude}; longitude: ${longitude};`);
                    model.setAttribute('gltf-model', `${filePath}`);
                    model.setAttribute('rotation', '0 0 0');
                    model.setAttribute('animation-mixer', 'clip: *; loop: repeat; timeScale: 1.1; clampWhenFinished: true; crossFadeDuration: 0.3');
                    model.setAttribute('look-at', '[camera]');
                    model.setAttribute('scale', '0.15 0.15 0.15'); // Initial scale
                    model.setAttribute('visible', 'false'); // Start with visibility off doesn't work for some reason.
                    model.classList.add(`${name}`);
                    
                    // append to scene first before checking if it's loaded
                    scene.appendChild(model);

                    model.addEventListener('model-loaded', () => {
                        console.log('model loaded');
                    })

                    // Define an object with properties for each model
                    let modelObject = {
                        name: modelSeparated.name,
                        lat: modelSeparated.location.lat,
                        lng: modelSeparated.location.lng,
                        filePath: modelSeparated.filePath,
                        visibilityRange: modelSeparated.visibilityRange
                    };

                    // Push the object to the array
                    modelsArray.push(modelObject);
                })
            }
        } 
        catch(error){
            reject(error);
        }
    })
}

// Step 2 --------------------------------
// make models invisible 
function renderModelVisibility(){
    try{
        // Hide all models initially
        modelsArray.forEach(model => {
            console.log(model.name);
            const modelElement = document.querySelector(`.${model.name}`);
            console.log(modelElement);
            modelElement.object3D.visible = false;
            console.log(modelElement.getAttribute("visible"));
        });
    } 
    catch(error){
        console.error(error);
    }
};

// Step 2 --------------------------------
// Create dropdown containers
// --- Variables
let dropdownVisible = false; // Toogle to hide and unhide dropdown containers
let selectedIcon = null; // Track the currently selected icon

function createDropdownContainer(){
    return new Promise((resolve, reject) => {
        
        try{
            const dropdownContainer = document.getElementById('dropdown-container'); // container housing all dropdown items
            const topLeftCircle = document.getElementById('top-left-circle'); // top left circle people click on to view more models.

            // Create the individual dropdown items
            createThumbnails(modelsArray);

            // Create the individual dropdown items.
            function createThumbnails(models){
                // Iterate over models and create thumbnails
                models.forEach(model => {
                    const thumbnail = document.createElement('div');
                    thumbnail.classList.add('dropdown-circle');
                    thumbnail.setAttribute('id', `${model.name}`);
                    // Create an image element for the model
                    const img = document.createElement('img');
                    img.src = `./assets/thumbnails/${model.name.toLowerCase()}.png`; // Assume icons follow model naming
                    img.alt = model.name;
                
                    // Append image to the circle
                    thumbnail.appendChild(img);

                    // apply all logic in separate function.
                    thumbnail.addEventListener('click', thumbnailClick)
                    // assign thumbnails to the container
                    dropdownContainer.appendChild(thumbnail);
                })
            }

            // handle visibility in another function. 
            topLeftCircle.addEventListener('click', modelDropDownVisibilityToggle);

            
            resolve(true);
        }
        catch(error){
            reject(error);
        }
        
    });

}

// Functions for DOM dropdown buttons
function modelDropDownVisibilityToggle(){
    const dropdownContainer = document.getElementById('dropdown-container'); // container housing all dropdown items
    dropdownVisible =!dropdownVisible;
    dropdownContainer.style.display = dropdownVisible? 'flex' : 'none';
}

// click event for thumbnails
function thumbnailClick(event){
    const clickedIcon = event.currentTarget; // Get the clicked thumbnail
    if(clickedIcon === selectedIcon){
        console.log('Already selected!');
    }
    else {
        // deselect previous icon
        if (selectedIcon) {
            selectedIcon.classList.remove('selected');
        }
        //select new icon
        clickedIcon.classList.add('selected');
        selectedIcon = clickedIcon;
        console.log(`selected icon ${selectedIcon.id}`);
        selectNewModel(clickedIcon.id);
    }
}

// What happens when you select a new model
async function selectNewModel(name){

    const locationDisplay = document.getElementById('location-display');
    locationDisplay.innerHTML = `Calculating Distance to ${name}`;
    // call function to select target
    selectedTarget(name);
}

// Step 3 --------------------------------
// Start Up Button
function createStartScreen(){
    return new Promise((resolve, reject) => {
        // adding greyed-out class to prevent person from clicking on icons
        document.querySelector('.circle-container').classList.add('greyed-out');
        document.getElementById('top-left-circle').classList.add('greyed-out');
        try{
            // Handle "Tap to Start" button click
            document.getElementById('start-button').addEventListener('click', startUp);
            resolve(true);
        } 
        catch(error){
            reject(error);
        }   
    })
}

// Removed Grey-out UI and starts the loops for finding player location and calculating relative position.
function startUp(){
    // Hide the start screen
    document.querySelector('.start').classList.add('hidden');
    // Remove the "greyed-out" class from other UI elements
    document.querySelector('.circle-container').classList.remove('greyed-out');
    document.getElementById('top-left-circle').classList.remove('greyed-out');

    const locationDisplay = document.getElementById('location-display');
    locationDisplay.innerHTML = 'Select a model to begin tracking!';

    console.log("START!");
}

// function to automatically select the target model. 

// Variables that are related to selected target. 
let targetName;
let distanceToTarget = 0;
let tooClose = false;
let tooFar = false;
let min;
let max;
let lat;
let lng;

const targetDetails = {
    targetName: targetName,
    distanceToTarget: distanceToTarget,
    tooClose: tooClose,
    tooFar: tooFar,
    min: min,
    max: max,
    lat: lat,
    lng: lng
};
// function to manually select the target model. (Updates the targetDetails)
function selectedTarget(name){
    try{
        // hide all previous models
        renderModelVisibility()
        console.log("selecting target...")
        modelsArray.forEach((model) => {
            if(model.name == name){
                targetDetails.targetName = model.name;
                targetDetails.min = model.visibilityRange.min;
                targetDetails.max = model.visibilityRange.max;
                targetDetails.lat = model.lat;
                targetDetails.lng = model.lng;
                startCompass();
                appLoop();
            };
        })
    }
    catch(error){
        console.error('Error selecting target in selectedTarget:', error);
    }
}


// Application loop function that calls the retrieve player data and relative position. 
function appLoop() {
    init();
    // console.log("starting app loop");
    // Retrieve player position and relative position to closest model.
    getPlayerPosition(findDistanceRelativeToModel);

    requestAnimationFrame(appLoop);
}

// function to retrieve player data every frame.
function getPlayerPosition(findDistanceRelativeToModel){
    try{
        // console.log("getting player position");
        if(navigator.geolocation){

        const options = {
            enableHighAccuracy: true,
            maximumAge: 0,
            };
            
            function success(pos) {
            const position = pos.coords;
            
            console.log("Your current position is:");
            console.log(`Latitude : ${position.latitude}`);
            console.log(`Longitude: ${position.longitude}`);
            console.log(`More or less ${position.accuracy} meters.`);

            const playerPos = {
                lat: position.latitude, 
                lng: position.longitude
            };
            
            console.log("Got player position");
            findDistanceRelativeToModel(playerPos, validateIfTooClose);
            }
            
            function error(err) {
            console.error(`ERROR(${err.code}): ${err.message}`);
            }

            navigator.geolocation.getCurrentPosition(success, error, options);
            
        } else {
            console.error("Geolocation is not supported by this browser.");
        }
    } 
    catch(error){
        console.error(error);
    }   
}


// function to retrieve player location relative to select model every frame. (Always called after player data is retrieved)
function findDistanceRelativeToModel(playerPos, validateIfTooClose) {
    try{   

        const target_lat = targetDetails.lat;
        const target_lng = targetDetails.lng;
        const player_lat = playerPos.lat;
        const player_lng = playerPos.lng;

        const disBetweenPlayerAndTarget = Number(calculateDistance(player_lat, player_lng, target_lat, target_lng));
            
        targetDetails.distanceToTarget = disBetweenPlayerAndTarget;    
        
        console.log("Found distance between player and target");
        validateIfTooClose(updateTextUIAndModelVisibility); 
    }
    catch(error){
        console.error(error);
    }   

}

// Function that consolidates if the player is too close to the target or not. 
function validateIfTooClose(updateTextUIAndModelVisibility){
    try {
        if(targetDetails.distanceToTarget >= targetDetails.min && targetDetails.distanceToTarget <= targetDetails.max){
            targetDetails.tooClose = false;
            targetDetails.tooFar = false;
        } else {
            if(targetDetails.distanceToTarget < targetDetails.min) {
                targetDetails.tooClose = true;
            } else{
                targetDetails.tooFar = true;
            }
        }
        console.log("Validated player distance to target");
        updateTextUIAndModelVisibility();
    }
    catch(error){
        console.error(error);
    }
}

// Function that updates the text UI and model visbility below the arrow 
function updateTextUIAndModelVisibility() {
    try{
        const locationDisplay = document.getElementById('location-display');

        // Get model entity in the scene
        const modelEntity = document.querySelector(`.${targetDetails.targetName}`);
        console.log(modelEntity);

        // Adjust visibility based on distance
        // This keeps all other models invisible because we disabled them from the start and only enable them here.
        if (!(targetDetails.tooClose && targetDetails.tooFar)) {
            modelEntity.object3D.visible = true;
        } else {
            modelEntity.object3D.visible = false;
        }

        // change text depending on distance between player and model
        if(targetDetails.tooClose == false && targetDetails.tooFar == false){
            locationDisplay.innerHTML = `${targetDetails.distanceToTarget.toFixed(2)} meters to ${targetDetails.targetName}`;
        } else if (targetDetails.tooClose == true && targetDetails.tooFar == false) {
            locationDisplay.innerHTML = `Too close to ${targetDetails.targetName}!`;
        } else if (targetDetails.tooClose == false && targetDetails.tooFar == true) {
            locationDisplay.innerHTML = `Too far from ${targetDetails.targetName}!: ${targetDetails.distanceToTarget.toFixed(2)} meters`;
        } else{
            locationDisplay.innerHTML = "No models found!";
        }
    } 
    catch(error){
        reject(error);
    }  
}

// Function to calculate the distance between two points in m.
function calculateDistance(lat1,lon1,lat2,lon2){
    try{
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(lat2-lat1);  // deg2rad below
        var dLon = deg2rad(lon2-lon1); 
        var a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2)
            ; 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d = R * c; // Distance in km
        return(d * 1000); // send distance in meters
        
        function deg2rad(deg) {
        return deg * (Math.PI/180)
        }
    }
    catch(error){
        console.error(error);
    }  
}

// Converts from degrees to radians.
function toRadians(degrees) {
    return degrees * Math.PI / 180;
};

// Converts from radians to degrees.
function toDegrees(radians) {
    return radians * 180 / Math.PI;
}


// ##################################################################################################
var current = { latitude: null, longitude: null };
var lastAlpha = 0;
var direction = 0;
const isIOS =
    navigator.userAgent.match(/(iPod|iPhone|iPad)/) &&
    navigator.userAgent.match(/AppleWebKit/);
const geolocationOptions = { enableHighAccuracy: true };

// Initialize geolocation and device orientation
function init() {
    // Continuously update current position with watchPosition
    navigator.geolocation.watchPosition(setCurrentPosition, null, geolocationOptions);

    // Add orientation event listener
    if (!isIOS) {
        window.addEventListener("deviceorientationabsolute", runCalculation);
    }
    updateUI(); // Start the UI update loop
}

// Set current position for use in direction calculation
function setCurrentPosition(position) {
    current.latitude = position.coords.latitude;
    current.longitude = position.coords.longitude;
}

// Request permission on iOS to use device orientation
function startCompass() {
    try{
        if (isIOS) {
            DeviceOrientationEvent.requestPermission()
                .then((response) => {
                    if (response === "granted") {
                        window.addEventListener("deviceorientation", runCalculation);
                    } else {
                        alert("Permission denied!");
                    }
                })
                .catch(() => alert("Device orientation not supported"));
        }
    }
    catch(error){
        console.error(error);
    }
    
}

// Calculate direction to target based on device orientation and player position
function runCalculation(event) {
    try {
        var alpha = Math.abs(360 - event.webkitCompassHeading) || event.alpha;

        if (alpha != null && Math.abs(alpha - lastAlpha) > 1) {
            var lat1 = current.latitude * (Math.PI / 180);
            var lon1 = current.longitude * (Math.PI / 180);
            var lat2 = targetDetails.lat * (Math.PI / 180);
            var lon2 = targetDetails.lng * (Math.PI / 180);

            // Calculate bearing from current position to target position
            var y = Math.sin(lon2 - lon1) * Math.cos(lat2);
            var x =
                Math.cos(lat1) * Math.sin(lat2) -
                Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
            var bearing = Math.atan2(y, x) * (180 / Math.PI);

            // Update direction with combined alpha and bearing
            direction = (alpha + bearing + 360) % 360;
            direction = direction.toFixed(0); // Round to nearest degree
            

            lastAlpha = alpha;
        } else{
            console.log("never called")
        }
    } catch (error) {
        console.error("Error calculating direction:", error);
    }
}

// Continuously update the UI to rotate the arrow
function updateUI() {
    const arrow = document.querySelector(`.arrow`);
    arrow.style.transform = `translate(-50%, -50%) rotate(${direction}deg)`;
    requestAnimationFrame(updateUI); // Repeat every frame
}

// Initialize compass and location tracking when DOM loads
document.addEventListener('DOMContentLoaded', function () {
    initializeMyApp();
});


