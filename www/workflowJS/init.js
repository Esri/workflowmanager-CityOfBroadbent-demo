/*
 * Copyright 2017 Esri
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

require([
  "esri/Map",
  "esri/views/MapView",

  "./workflowJS/workflow.js",

  "dojo/query",
  "dojo/on",

  "dojo/domReady!"
], function(Map, MapView, workflow, query, on){
  var map = new Map({
    basemap: "streets"
  });
  var view = new MapView({
    container: "mapView",  // Reference to the scene div created in step 5
    map: map,  // Reference to the map object created before the scene
    zoom: 4,  // Sets the zoom level based on level of detail (LOD)
    center: [15, 65]  // Sets the center point of view in lon/lat
  });

  workflow.startup();

  //
  // Create job button events
  //
  on(query('#createSignageBtn'),'click',function(){
    workflow.createJob("404", 1);
  });

  on(query('#createGraffitiReportBtn'),'click',function(){
    // TODO: Update this.  No such graffiti report job type on sample server
    // For now, use data edits job type
    workflow.createJob("402", 2);
  });

  on(query('#createTrafficAccidentBtn'),'click',function(){
    workflow.createJob("405", 3);
  });

  //
  // Open modal button events
  //
  on(query('#openSignageBtn'),'click',function(){
    $('#modal').openModal();
  });

  on(query('#openGraffitiBtn'),'click',function(){
    $('#modal').openModal();
  });

  on(query('#openTrafficBtn'),'click',function(){
    $('#modal').openModal();
  });

  //
  // Workflow execution button events
  //
  on(query('#executeBtn'),'click',function(){
    workflow.executeStep();
  });
  
  on(query('#markCompleteBtn'),'click',function(){
    workflow.markAsComplete();
  });
});
