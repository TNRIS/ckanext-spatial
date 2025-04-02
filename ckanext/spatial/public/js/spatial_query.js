/* Module for handling the spatial querying
 */
this.ckan.module('spatial-query', function ($, _) {

  return {
    options: {
      map_config: {
        type: "custom",
        "custom_url": "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        "attribution": "&copy; <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a>"
      },
      i18n: {
      },
      style: {
        color: '#F06F64',
        weight: 2,
        opacity: 1,
        fillColor: '#F06F64',
        fillOpacity: 0.1,
        clickable: false
      },
      default_extent: [[90, 180], [-90, -180]]
    },
    template: {
      buttons: [
        '<div id="dataset-map-edit-buttons">',
        '<a href="javascript:;" class="btn cancel">Cancel</a> ',
        '<a href="javascript:;" class="btn apply disabled">Apply</a>',
        '</div>'
      ].join(''),
      modal: {
        bootstrap3: [
          '<div class="modal">',
          '<div class="modal-dialog modal-lg">',
          '<div class="modal-content">',
          '<div class="modal-header">',
          '<button type="button" class="close" data-dismiss="modal">×</button>',
          '<h3 class="modal-title"></h3>',
          '</div>',
          '<div class="modal-body"><div id="draw-map-container"></div></div>',
          '<div class="modal-footer">',
          '<button class="btn btn-default btn-cancel" data-dismiss="modal"></button>',
          '<button class="btn apply btn-primary disabled"></button>',
          '</div>',
          '</div>',
          '</div>',
          '</div>'
        ].join('\n'),
        bootstrap5: [
          '<div class="modal" tabindex="-1">',
          '<div class="modal-dialog modal-lg modal-spatial-query">',
          '<div class="modal-content">',
          '<div class="modal-header">',
          '<h4 class="modal-title"></h4>',
          '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>',
          '</div>',
          `<div class="modal-body">
            <input class="rounded-2" id="search-address-box" type="text" placeholder="Search for an address.">
            <button class="btn btn-primary" type="button" id="search-address-button" disabled>Search address</button>
            <div id="search-dropdown" class="dropdown d-inline-flex d-none" style="width: fit-content">
              <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenu2" data-bs-toggle="dropdown" aria-expanded="false">
                View results
              </button>
              <ul id="search-dropdown-list" class="dropdown-menu" style="z-index: 1001;" aria-labelledby="dropdownMenu2"></ul>
            </div>
            <span id="no-results-text" class="d-none text-danger">No results found.</span>
            <div id="draw-map-container">
          </div></div>`,
          '<div class="modal-footer">',
          '<button type="button" class="btn btn-secondary btn-cancel" data-bs-dismiss="modal"></button>',
          '<button type="button" class="btn btn-primary apply disabled"></button>',
          '</div>',
          '</div>',
          '</div>',
          '</div>'
        ].join('\n')
      }
    },

    initialize: function () {
      var module = this;
      $.proxyAll(this, /_on/);

      var user_default_extent = this.el.data('default_extent');
      if (user_default_extent ){
        if (user_default_extent instanceof Array) {
          // Assume it's a pair of coords like [[90, 180], [-90, -180]]
          this.options.default_extent = user_default_extent;
        } else if (user_default_extent instanceof Object) {
          // Assume it's a GeoJSON bbox
          this.options.default_extent = new L.GeoJSON(user_default_extent).getBounds();
        }
      }
      this.el.ready(this._onReady);
    },

    async runAddressSearch(search_query) {
      this.searchAddressButton.innerText = "Searching...";
      const nominatimEndpoint = `https://nominatim.openstreetmap.org/search?addressdetails=1&q=${search_query}&format=jsonv2&limit=10`;
      fetch(nominatimEndpoint, {
        headers: {
          "User-Agent": "Texas Water Development Hub"
        },
        signal: AbortSignal.timeout(5000)
      }).then((res) => res.json().then((data) => {
        if (data && data.length > 1) {
          this.searchResults = data.map((entry) => { return { "display_name": entry.display_name, "boundingbox": entry.boundingbox }; })
          // Jump to first result.
          const firstBoundingBox = this.searchResults[0]["boundingbox"];
          this.drawMap.fitBounds([[firstBoundingBox[0], firstBoundingBox[2]], [firstBoundingBox[1], firstBoundingBox[3]]]);
          const searchDropdownList = document.getElementById("search-dropdown-list");
          // Remove previous search results
          while (searchDropdownList.hasChildNodes()) {
            searchDropdownList.removeChild(searchDropdownList.firstChild)
          }
          // Add search results to the dropdown
          for (const entry of this.searchResults) {
            const entryLi = document.createElement("li");
            const entryButton = document.createElement("button");
            entryButton.classList.add("dropdown-item");
            entryButton.type = "button";
            // entryButton.innerText = `${entry["display_name"]} | (${entry["lat"]}, ${entry["lon"]})`;
            entryButton.innerText = entry["display_name"];
            entryButton.onclick = () => {
              const boundingbox = entry["boundingbox"];
              this.drawMap.fitBounds([[boundingbox[0], boundingbox[2]], [boundingbox[1], boundingbox[3]]]);
            }
            entryLi.appendChild(entryButton);
            searchDropdownList.appendChild(entryLi);
          };
          this.searchDropdown.classList.remove("d-none");
        }
        else if (data && data.length > 0) {
          const boundingBox = data[0]["boundingbox"];
          this.drawMap.fitBounds([[boundingBox[0], boundingBox[2]], [boundingBox[1], boundingBox[3]]]);
        } else {
          this.noResultsText.classList.remove("d-none");
        }
      })).finally(() => {
        this.searchAddressButton.removeAttribute("disabled")
        this.searchAddressButton.innerText = "Search address";
      });
    },

    _getBootstrapVersion: function () {
      return $.fn.modal.Constructor.VERSION.split(".")[0];
    },

    _createModal: function () {
      if (!this.modal) {
        var element = this.modal = jQuery(this.template.modal["bootstrap" + this._getBootstrapVersion()]);
        element.on('click', '.btn-primary', this._onApply);
        element.on('click', '.btn-cancel', this._onCancel);
        element.modal({show: false});

        element.find('.modal-title').text(this._('Please draw query extent in the map:'));
        element.find('.apply').text(this._('Apply'));
        element.find('.btn-cancel').text(this._('Cancel'));

        var module = this;

        this.modal.on('shown.bs.modal', function () {
          if (module.drawMap) {
            module._setPreviousBBBox(map, zoom=false);
            map.fitBounds(module.mainMap.getBounds());

            $('a.leaflet-draw-draw-rectangle>span', element).trigger('click');
            return
          }
          var container = element.find('#draw-map-container')[0];
          module.drawMap = map = module._createMap(container);

          // Initialize the draw control
          var draw = new L.Control.Draw({
            position: 'topright',
            draw: {
              polyline: false,
              polygon: false,
              circle: false,
              circlemarker: false,
              marker: false,
              rectangle: {shapeOptions: module.options.style}
            }
          });

          map.addControl(draw);

          module._setPreviousBBBox(map, zoom=false);
          map.fitBounds(module.mainMap.getBounds());

          if (map.getZoom() == 0) {
            map.zoomIn();
          }

          map.on('draw:created', function (e) {
            if (module.extentLayer) {
              map.removeLayer(module.extentLayer);
            }
            module.extentLayer = extentLayer = e.layer;
            module.ext_bbox_input.val(extentLayer.getBounds().toBBoxString());
            map.addLayer(extentLayer);
            element.find('.btn-primary').removeClass('disabled').addClass('btn-primary');
          });

          $('a.leaflet-draw-draw-rectangle>span', element).trigger('click');
          element.find('.btn-primary').focus()

          // Search address feature
          module.searchAddressBox = document.getElementById('search-address-box');
          module.searchAddressButton = document.getElementById('search-address-button');
          module.searchDropdown = document.getElementById("search-dropdown");
          module.noResultsText = document.getElementById("no-results-text");
          // Disable default enter key behavior when pressing enter in the searchbox
          module.searchAddressBox.onkeydown = (e) => {
            module.noResultsText.classList.add("d-none");
            module.searchDropdown.classList.add("d-none");
            if (e.key === "Enter" && (!module.searchAddressButton.getAttribute("disabled") || module.searchAddressButton.getAttribute("disabled") === "false")) {
              e?.preventDefault();
            }
          }
          module.searchAddressBox.onkeyup = (e) => {
            e?.preventDefault();
            // When there is a value in the searchbox, enable the search button
            if (module.searchAddressBox.value) {
              module.searchAddressButton.removeAttribute("disabled")
            }
            // When the searchbox is empty, disable the search button
            else {
              module.searchAddressButton.setAttribute("disabled", true)
            }
            // If the user presses the Enter key in the searchbox and the search button is not disabled, run the search
            if (e.key === "Enter" && (!module.searchAddressButton.getAttribute("disabled") || module.searchAddressButton.getAttribute("disabled") === "false")) {
              module.searchAddressButton.click();
            }
          }
          // If the search button is clicked, disable the search button and run the search
          module.searchAddressButton.onclick = (e) => {
            e?.preventDefault();
            module.searchAddressButton.setAttribute("disabled", true);
            module.runAddressSearch(module.searchAddressBox.value);
          }
        })

        this.modal.on('hidden.bs.modal', function () {
          module._onCancel()
        });

      }
      return this.modal;
    },

    _getParameterByName: function (name) {
      var match = RegExp('[?&]' + name + '=([^&]*)')
                        .exec(window.location.search);
      return match ?
          decodeURIComponent(match[1].replace(/\+/g, ' '))
          : null;
    },

    _drawExtentFromCoords: function(xmin, ymin, xmax, ymax) {
        if ($.isArray(xmin)) {
            var coords = xmin;
            xmin = coords[0]; ymin = coords[1]; xmax = coords[2]; ymax = coords[3];
        }
        return new L.Rectangle([[ymin, xmin], [ymax, xmax]],
                               this.options.style);
    },

    _drawExtentFromGeoJSON: function(geom) {
        return new L.GeoJSON(geom, {style: this.options.style});
    },

    _onApply: function() {
      $(".search-form").submit();
    },

    _onCancel: function() {
      if (this.extentLayer) {
        this.drawMap.removeLayer(this.extentLayer);
      }
    },

    _createMap: function(container) {
      map = ckan.commonLeafletMap(
        container,
        this.options.map_config,
        {
          attributionControl: false,
          drawControlTooltips: false,
        }
      );

      return map;

    },

    // Is there an existing box from a previous search?
    _setPreviousBBBox: function(map, zoom=true) {
      let module = this;
      previous_bbox = module._getParameterByName('ext_bbox');
      if (previous_bbox) {
        module.ext_bbox_input.val(previous_bbox);
        module.extentLayer = module._drawExtentFromCoords(previous_bbox.split(','))
        map.addLayer(module.extentLayer);
        if (zoom) {
          map.fitBounds(module.extentLayer.getBounds(), {"animate": false, "padding": [20, 20]});
        }
      } else {
        map.fitBounds(module.options.default_extent, {"animate": false});
      }
    },

    _onReady: function() {
      let module = this;
      let map;
      let form = $('#dataset-search-form');
      let bbox_input_id = 'ext_bbox';

      // Add necessary field to the search form if not already created
      if ($("#" + bbox_input_id).length === 0) {
        $('<input type="hidden" />').attr({'id': bbox_input_id, 'name': bbox_input_id}).appendTo(form);
      }
      module.ext_bbox_input = $('#dataset-search-form #ext_bbox');

      // OK map time
      this.mainMap = map = this._createMap('dataset-map-container');

      var expandButton = L.Control.extend({
        position: 'topright',
        onAdd: function(map) {
          var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

          var button = L.DomUtil.create('a', 'leaflet-control-custom-button', container);
          button.innerHTML = '<i class="fa fa-pencil"></i>';
          button.title = module._('Draw an extent');

          L.DomEvent.on(button, 'click', function(e) {
            module.sandbox.body.append(module._createModal());
            module.modal.modal('show');

          });

          return container;
        }
      });
      map.addControl(new expandButton());

      module._setPreviousBBBox(map);

    }
  }
});
