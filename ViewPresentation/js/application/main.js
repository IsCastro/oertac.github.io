/*
 | Copyright 2016 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */
define([
  "boilerplate",
  "boilerplate/ItemHelper",
  "boilerplate/UrlParamHelper",
  "dojo/i18n!./nls/resources",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/on",
  "dojo/Deferred",
  "put-selector/put",
  "dojo/dom",
  "dojo/dom-attr",
  "dojo/dom-class",
  "dijit/registry",
  "widgets/ViewLocations"
], function (Boilerplate, ItemHelper, UrlParamHelper, i18n,
             lang, array, on, Deferred, put, dom, domAttr, domClass,
             registry, ViewLocations) {

  var CSS = {
    loading: "boilerplate--loading",
    error: "boilerplate--error",
    errorIcon: "esri-icon-notice-round"
  };

  return Boilerplate.createSubclass({

    /**
     *  CONSTRUCTOR
     */
    constructor: function () {
      this.always(this.init.bind(this));
    },

    /**
     * INITIALIZE APPLICATION
     */
    init: function () {

      // SET LOCALE AND DIRECTION //
      this._setLocaleAndDirection();

      // HELPERS //
      this.urlParamHelper = new UrlParamHelper();
      this.itemHelper = new ItemHelper();

      if(this.results.webMapItem) {
        // LOAD WEB MAP //
        this._createView(this.results.webMapItem).then(this.applicationReady.bind(this));
      } else if(this.results.webSceneItem) {
        // LOAD WEB SCENE //
        this._createView(this.results.webSceneItem).then(this.applicationReady.bind(this));
      } else if(this.results.groupData) {
        // LOAD GROUP GALLERY //
        this._createGroupGallery(this.results.groupData);
        this.applicationReady();
      } else {
        // ERROR //
        this.reportError(new Error("main:: Could not load an item to display"));
      }

    },

    /**
     *
     * @param error
     * @returns {*}
     */
    reportError: function (error) {
      // remove loading class from body
      domClass.remove(document.body, CSS.loading);
      domClass.add(document.body, CSS.error);
      // an error occurred - notify the user. In this example we pull the string from the
      // resource.js file located in the nls folder because we've set the application up
      // for localization. If you don't need to support multiple languages you can hardcode the
      // strings here and comment out the call in index.html to get the localization strings.
      // set message
      var node = dom.byId("loading_message");
      if(node) {
        node.innerHTML = "<h1><span class=\"" + CSS.errorIcon + "\"></span> " + i18n.error + "</h1><p>" + error.message + "</p>";
      }
      return error;
    },

    /**
     * SET LOCALE AND DIRECTION
     *
     * @private
     */
    _setLocaleAndDirection: function () {
      // LOCALE //
      document.documentElement.lang = this.locale;
      // DIRECTION //
      var direction = this.direction;
      var dirNode = document.getElementsByTagName("html")[0];
      domAttr.set(dirNode, "dir", direction);
    },

    /**
     *
     * @param groupData
     * @private
     */
    _createGroupGallery: function (groupData) {
      var groupInfoData = groupData.infoData;
      var groupItemsData = groupData.itemsData;

      if(!groupInfoData || !groupItemsData || groupInfoData.total === 0 || groupInfoData instanceof Error) {
        this.reportError(new Error("main:: group data does not exist."));
        return;
      }

      var info = groupInfoData.results[0];
      var items = groupItemsData.results;

      domClass.remove(document.body, CSS.loading);
      document.title = this.config.title;

      if(info && items) {
        var html = "";
        html += "<h1>" + info.title + "</h1>";
        html += "<ol>";
        items.forEach(function (item) {
          html += "<li>" + item.title + "</li>";
        });
        html += "</ol>";

        document.body.innerHTML = html;
      }
    },

    /**
     *
     * @param item
     * @private
     */
    _createView: function (item) {
      var deferred = new Deferred();

      // ITEM TYPE //
      var type = item.data.type.replace(/Web /, "");
      var actionType = lang.replace("createWeb{type}", { type: type });
      var viewType = lang.replace("esri/views/{type}View", { type: type });
      var settingType = lang.replace("web{type}", { type: type.toLowerCase() });

      // CREATE MAP //
      this.itemHelper[actionType](item).then(function (map) {

        // TITLE //
        if(!this.config.title && map.portalItem && map.portalItem.title) {
          this.config.title = map.portalItem.title;
        }
        document.title = this.config.title;

        // GET VIEW //
        require([viewType], function (MapOrSceneView) {

          // VIEW PROPERTIES //
          var viewProperties = lang.mixin({
            map: map,
            container: this.settings[settingType].containerId
          }, this.urlParamHelper.getViewProperties(this.config));

          // CREATE VIEW //
          var view = new MapOrSceneView(viewProperties);
          view.then(function (response) {
            this.urlParamHelper.addToView(view, this.config);

            // APP IS READY //
            domClass.remove(document.body, CSS.loading);
            deferred.resolve({ map: map, view: view });

          }.bind(this), this.reportError);
        }.bind(this));
      }.bind(this), this.reportError);

      return deferred.promise;
    },


    /**
     * THE APPLICATION IS READY
     *
     * @param evt
     *   - map: WebMap | WebScene
     *   - view: MapView | SceneView
     */
    applicationReady: function (evt) {
      console.info("Application Ready: ", evt.map, evt.view);

      // ADD VIEW LOCATIONS WIDGET //
      this.viewLocations = new ViewLocations({
        view: evt.view,
        title: this.config.title
      }, dom.byId("view-locations"));
      this.viewLocations.startup();

    }

  });
});
