 /* Copyright 2017 Esri

   Licensed under the Apache License, Version 2.0 (the "License");

   you may not use this file except in compliance with the License.

   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software

   distributed under the License is distributed on an "AS IS" BASIS,

   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

   See the License for the specific language governing permissions and

   limitations under the License.
   ​
   */

/*
 * Title: App Configuration Script
 * Author: Lisa Staehli
 * Date: 04/24/17
 * Description: Used to configure and link a webscene
 * with corresponding attributes for visualization
 * and statistics. A webscene with a scene service 
 * that contains the following required attributes on 
 * unit level for each feature needs to be set-up first: 
 * - building id (int)
 * - floor level (int)
 * - usage (string)
 * - area (float)
 */

define([
    "esri/core/declare",
    "esri/config",

    "esri/WebScene",
    "esri/views/SceneView",
    "esri/layers/SceneLayer",
    "esri/Basemap",

    "esri/widgets/BasemapToggle",
    "esri/widgets/Home",

    "dojo/dom",
    "dojo/on",
    "dojo/dom-construct",
    "dojo/_base/window",
    "dojo/dom-style",

    "esri/widgets/Search",

    "c-through/ToolsMenu",
    "c-through/welcome",
    "c-through/support/queryTools"

], function (
    declare, esriConfig,
    WebScene, SceneView, SceneLayer, Basemap,
    BasemapToggle, Home,
    dom, on, domCtr, win, domStyle,
    Search,
    ToolsMenu, Welcome, queryTools) {

        // application settings
        var settings_demo = {
            name: "Demo",
            url: "http://arcgis.com/",           // portal URL for config
            webscene: "7b6fd85102524d5caf4c7ed34bf5eb31",   // portal item ID of the webscene
            usagename: "usage",                             // usage attribute (string)
            floorname: "floorID",                           // floor attribute (int)
            OIDname: "OBJECTID",                            // objectid
            buildingIDname: "buildingID",                   // building attribute (int)
            areaname: "unitarea",                           // area attribute (float)
            color: [                                        // color ramp for unique value renderer
                    [178, 171, 210, 1],                     
                    [253, 174, 97, 1],
                    [50, 136, 189, 1],
                    [102, 194, 165, 1],
                    [230, 245, 152, 1],
                    [213, 62, 79, 1],
                    [94, 79, 162, 1],
                    [254, 224, 139, 1],
                    [253, 174, 97, 1],
                    [135, 135, 135, 1],
                    [255, 255, 153, 1],
                    [185, 185, 185, 1],
                    [171, 221, 164, 1],
                    [202, 178, 214, 1],
                    [251, 128, 114, 1],
                    [214, 96, 77, 1],
                    [209, 229, 240, 1],
                    [254, 224, 182, 1]
                ]
        };

        return declare(null, {

            constructor: function () {

            },

            init: function (settings) {

                // destroy welcome page when app is started
                domCtr.destroy("welcome");

                // create header with title according to choice on welcome page
                var header = domCtr.create("div", { id: "header" }, win.body());
                domCtr.create("div", { id: "headerTitle" }, header);

                // get settings from choice on welcome page
                this.settings = this.getSettingsFromUser(settings);

                // set portal url
                esriConfig.portalUrl = this.settings.url;

                // fix CORS issues by adding portal url to cors enabled servers list
                esriConfig.request.corsEnabledServers.push("http://zurich.maps.arcgis.com");

                // load scene with portal ID
                this.scene = new WebScene({
                    portalItem: {
                        id: this.settings.webscene
                    },
                    basemap: "topo"
                });

                // create a view
                this.view = new SceneView({
                    container: "viewDiv",
                    map: this.scene,
                    qualityProfile: "high"
                });

                // environment settings for better visuals (shadows)
                this.view.environment.lighting.ambientOcclusionEnabled = true;
                this.view.environment.lighting.directShadowsEnabled = true;

                // basemap toggle for switching on and off the basemap (see below ground)
                var gray = Basemap.fromId("gray");
                var terrain = Basemap.fromId("topo");

                // bug, does not seem to apply thumbnail anymore since 4.2
                gray.thumbnailUrl = "img/basemap_thumbnail.PNG";    
                terrain.thumbnailURL = "img/thumbnail_topo.PNG";

                var toggle = new BasemapToggle({
                    view: this.view,
                    nextBasemap: gray
                });
                toggle.startup();
                this.view.ui.add(toggle, "bottom-left");

                // create search widget
                var searchWidget = new Search({
                    view: this.view
                });
                this.view.ui.add(searchWidget, {
                    position: "top-right",
                    index: 2
                });

                // create home button that leads back to welcome page
                var home = domCtr.create("div", { className: "button", id: "homeButton", innerHTML: "Startseite" }, header);

                on(home, "click", function () {
                    var URI = window.location.href;
                    var newURI = URI.substring(0, URI.lastIndexOf("?"));
                    window.location.href = newURI;
                }.bind(this));

                // create home widget for scene view
                var homeWidget = new Home({
                    view: this.view
                });
                this.view.ui.add(homeWidget, "top-left");

                // wait until view is loaded
                this.view.then(function () {
                    // layer1 = active layer (receives renderers, used for statistics, selected)
                    // layer2 = background layer (shows remaining buildings, not selected)

                    // retrieve active layer from webscene
                    this.settings.layer1 = this.scene.layers.getItemAt(0);

                    // create background layer (identical copy of activ layer) for highlighting and add it to the scene
                    this.settings.layer2 = new SceneLayer({
                        url: this.settings.layer1.url,
                        popupEnabled: false
                    });
                    this.scene.add(this.settings.layer2);

                    this.settings.layer1.visible = true;
                    this.settings.layer2.visible = false;

                    // retrieve distinct values of usage attribute from feature service to create UI (filter dropdowns)
                    queryTools.distinctValues(this.settings.layer1, this.settings.usagename, this.settings.OIDname, function (distinctValues) {

                        distinctValues.sort();
                        this.settings.values = distinctValues;

                        // initiliaze tools menu with state
                        this.menu = new ToolsMenu({
                            config: this.settings,
                            map: this.scene,
                            view: this.view,
                            state: {
                                highlight: {
                                    name: "city",
                                    features: undefined
                                },
                                viz: {
                                    name: "white"
                                },
                                filter: {
                                    name: "none",
                                    usageFeatures: undefined,
                                    areaFeatures: undefined,
                                    floorFeatures: undefined
                                },
                                combinedFilteredFeatures: undefined
                            }
                        });
                    }.bind(this));

                    // configure basemap toggle to show and hide basemap to see below ground
                    var toggleDiv = document.getElementsByClassName("esri-component esri-basemap-toggle esri-widget");

                    on(toggleDiv[0], "click", function () {
                        this.scene.basemap.then(function () {
                            var basemapTerrain = this.view.basemapTerrain;
                            if (this.scene.basemap.title === "Light Gray Canvas") {
                                basemapTerrain.wireframe = {
                                    mode: "shader",
                                    wireOpacity: 1.0,
                                    surfaceOpacity: 0,
                                    width: 1,
                                    subdivision: "constant",
                                    subdivisionReduceLevels: 2
                                };
                                basemapTerrain.frontMostTransparent = true;

                            }
                            else {
                                basemapTerrain.wireframe = false;
                                basemapTerrain.frontMostTransparent = false;
                            }

                        }.bind(this));
                    }.bind(this));

                }.bind(this)).otherwise(function (err) {
                    console.error(err);
                });

            },

            getSettingsFromUser: function (settings) {
                if (settings === "demo"){
                    dom.byId("headerTitle").innerHTML = "3D-Gebäude Explorer";
                    return settings_demo;
                }
            }
        });
    });




