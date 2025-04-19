# NaviGo

## Members

**Arijit**  
* Developed full integration between the React front end and Node.js + Neo4j back end for end-to-end navigation.  
* Implemented dynamic arrow animation on the map (MapView.jsx) and updated routing logic.  
* Deployed the front end on GitHub Pages with proper Vite base configuration  
* Deployed the back end on Render, fixed CORS issues, and updated API calls to use the live back-end URL.  
* Set up GitHub Actions for auto-deployment of the front end on every push.   
* Debugged and resolved fetch errors, deployment problems, and asset loading issues.  
* Integrated Pedestrian Dead Reckoning (PDR) using device orientation/motion events.  
* Developed subsection splitting logic in OngoingNavigation to break routes into ~15m chunks.  
* Implemented dynamic user marker and compass heading overlay on the map.  
* Established an iOS sensor permission flow using DeviceOrientationEvent.requestPermission.  
* Tested and refined map scaling and gesture controls for mobile devices.  
* Coordinated code integration between NavigationPage and OngoingNavigation to ensure a consistent user flow.  
* Implemented compass-based navigation using device orientation events and gamma calibration (mapRotation) from sensorUtils.js.  
* Modified MapView.jsx to compute turn angles as (Alpha - Phi + Gamma) and update the user marker’s orientation.  
* Enhanced subsection rendering by ensuring overlapping nodes in short route chunks and added a "Previous" button in OngoingNavigation for backward navigation.  


**Kiranpreet** 

* Implemented Firebase Authentication (login/logout)
* Integrated Firestore to store and fetch trip data
* Built responsive User Profile Page with previous trips
* Connected "Start Trip" button to store trip in Firestore
* Added UI enhancements with MUI (avatars, buttons, layout)
* Debugged navigation flow and Firestore data rendering

**Zach**  

**Gursaroop**  
* Digitized the floorplans of VCC as found publically in colloboration with Gurneet.
* Standardized the scale, grid size and image to plot the coordinates on.
* Used Python and pyplot to mark the coordinates on the image.
* Helped in marking and manually validating coordinates of elements in: elevator.json, landmark.json, reference.json, washroom.json, universal_washroom.json, traversable.json and room.json.
  
**Gurneet**
* Digitized the floorplans of VCC as found publically in colloboration with Gursaroop.
* Used Python and pyplot to mark the coordinates on the image.
* Helped in marking and manually validating coordinates of elements in: elevator.json, landmark.json, reference.json, washroom.json, universal_washroom.json, traversable.json and room.json.

**Aiden**  
* Researched map rendering solutions.  
* Researched path and node rendering solutions.  
* Developed the initial version of the app's map rendering.  
* Converted pathfinding back-end output to front-end renders.  
* Implemented clickable room nodes.

## Description

(Your project overview goes here.)

## Documentation

(Include any user guides, API documentation, setup instructions, etc.)
