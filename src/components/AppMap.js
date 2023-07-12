import React, { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./AppMap.css";
import { GeocodingControl } from "@maptiler/geocoding-control/maplibregl";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import queryString from "query-string";
import { MD5 } from "crypto-js";

export default function AppMap() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [lng] = useState(139.753);
  const [lat] = useState(35.6844);
  const [zoom] = useState(14);
  const [API_KEY] = useState("bUNkGxzojTZOBuCGooQ2");

  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/satellite/style.json?key=${API_KEY}`,
      center: [lng, lat],
      zoom: zoom,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    new maplibregl.Marker({ color: "#FF0000" })
      .setLngLat([139.7525, 35.6846])
      .addTo(map.current);

    marker.current = new maplibregl.Marker({ color: "#FF0000" })
      .setLngLat([139.7525, 35.6846])
      .addTo(map.current);

    const popup = new maplibregl.Popup({ offset: 25 }).setText(
      "Hello, this is a popup!"
    );
    marker.current.setPopup(popup);

    const geocodingControl = new GeocodingControl({
      apiKey: API_KEY,
      maplibregl,
    });
    map.current.addControl(geocodingControl, "top-left");

    // Votre code JavaScript ici
    map.current.on("load", function () {
      toggleSidebar("left");
      map.current.on("click", "poi", async function (e) {
        marker.current.setLngLat(e.lngLat).addTo(map.current);
        const feature = e.features[0];
        const osmInfo = await getOMSInfo(feature.id);
        const wikidata = await getWikidata(osmInfo?.tags);
        showPoiInfo(feature, osmInfo, wikidata);
      });
    });

    async function getOMSInfo(id) {
      const query = queryString.stringify({
        data: `[out:json][timeout:25];
          node(${id / 10});
          out tags;`,
      });
      const response = await fetch(
        `https://overpass-api.de/api/interpreter?${query}`,
        {
          redirect: "follow",
          headers: {
            accept: "application/json",
          },
        }
      );
      const info = await response.json();
      return info?.elements[0] ? info.elements[0] : null;
    }

    function getWikidataId(tags) {
      if (!tags) return null;
      const regexWikidata = /(\w*:)?wikidata/;
      const key = Object.keys(tags).find((key) => key.match(regexWikidata));
      return tags[key] ? tags[key] : null;
    }

    function getWikidataImageHash(name) {
      const imageHash = MD5(name);
      return imageHash;
    }

    function getWikidataImagePath(image_name) {
      const name = image_name.replace(/\s+/g, "_");
      const hash = getWikidataImageHash(name);
      return `https://upload.wikimedia.org/wikipedia/commons/${hash.substring(
        0,
        1
      )}/${hash.substring(0, 2)}/${name}`;
    }

    async function getWikidata(tags) {
      const id = getWikidataId(tags);
      if (!id) return null;
      const response = await fetch(
        `https://www.wikidata.org/wiki/Special:EntityData/${id}.json?flavor=simple`
      );
      const info = await response.json();
      let image;
      if (info.entities[id].claims.P154) {
        image = getWikidataImagePath(
          info.entities[id].claims.P154[0].mainsnak.datavalue.value
        );
      } else if (info.entities[id].claims.P18) {
        image = getWikidataImagePath(
          info.entities[id].claims.P18[0].mainsnak.datavalue.value
        );
      }

      return image ? { ...info.entities[id], ...{ image } } : info.entities[id];
    }

    function showPoiInfo(feature, osmInfo, wikidata) {
      const textHtml = [];
      if (wikidata?.image) {
        textHtml.push(`<img src="${wikidata?.image}" />`);
      }
      textHtml.push(`<h1>${feature.properties.name}</h1>`);
      if (feature.properties.class !== feature.properties.subclass) {
        textHtml.push(
          `<h4>${feature.properties.class} (<small>${feature.properties.subclass}</small>)</h4>`
        );
      } else {
        textHtml.push(`<h4>${feature.properties.class}</h4>`);
      }
      if (osmInfo && osmInfo?.tags) {
        const {
          opening_hours,
          "contact:website": contact_website,
          website,
          ...tags
        } = osmInfo.tags;
        if (contact_website || website) {
          let web = website ?? contact_website;
          textHtml.push(`<div><a href="${web}">${web}</a></div>`);
        }
        if (opening_hours) {
          textHtml.push(`<h3>Opening hours</h3>`);
          osmInfo?.tags?.opening_hours.split(",").forEach((element) => {
            textHtml.push(`<div>${element.trim()}</div>`);
          });
        }
        if (tags) {
          textHtml.push(`<h3>Details</h3>`);
          textHtml.push(`<div class="details-info">`);
          Object.keys(tags).forEach((element) => {
            if (element.includes("email")) {
              textHtml.push(
                `<div><label>${element}:</label><a href="mailto: ${tags[element]}">${tags[element]}</a></div>`
              );
            } else if (element.includes("website")) {
              textHtml.push(
                `<div><label>${element}:</label><a href="${tags[element]}">${tags[element]}</a></div>`
              );
            } else if (element.includes("wikidata")) {
              textHtml.push(
                `<div><label>${element}:</label><a href="https://www.wikidata.org/wiki/${tags[element]}">${tags[element]}</a></div>`
              );
            } else if (element.includes("wikipedia")) {
              const [lang, term] = tags[element].split(":");
              textHtml.push(
                `<div><label>${element}:</label><a href="https://${lang}.wikipedia.org/wiki/${term}">${tags[element]}</a></div>`
              );
            } else {
              textHtml.push(
                `<div><label>${element}:</label>${tags[element]}</div>`
              );
            }
          });
          textHtml.push(`</div>`);
        }
      }
      document.querySelector(".sidebar-content-info").innerHTML =
        textHtml.join("");
      showSidebar("left");
    }

    function showSidebar(id) {
      const elem = document.getElementById(id);
      const classes = elem.className.split(" ");
      const collapsed = classes.indexOf("collapsed") !== -1;
      const padding = {};
      if (collapsed) {
        // Remove the 'collapsed' class from the class list of the element, this sets it back to the expanded state.
        classes.splice(classes.indexOf("collapsed"), 1);

        padding[id] = 300; // In px, matches the width of the sidebars set in .sidebar CSS class
        map.current.easeTo({
          padding: padding,
          duration: 1000, // In ms, CSS transition duration property for the sidebar matches this value
        });
        // Update the class list on the element
        elem.className = classes.join(" ");
      }
    }

    function toggleSidebar(id) {
      const elem = document.getElementById(id);
      const classes = elem.className.split(" ");
      const collapsed = classes.indexOf("collapsed") !== -1;

      const padding = {};

      if (collapsed) {
        // Remove the 'collapsed' class from the class list of the element, this sets it back to the expanded state.
        classes.splice(classes.indexOf("collapsed"), 1);

        padding[id] = 300; // In px, matches the width of the sidebars set in .sidebar CSS class
        map.current.easeTo({
          padding: padding,
          duration: 1000, // In ms, CSS transition duration property for the sidebar matches this value
        });
      } else {
        padding[id] = 0;
        // Add the 'collapsed' class to the class list of the element
        classes.push("collapsed");

        map.current.easeTo({
          padding: padding,
          duration: 1000,
        });
      }

      // Update the class list on the element
      elem.className = classes.join(" ");
    }

    document
      .querySelector(".sidebar-toggle")
      .addEventListener("click", function () {
        toggleSidebar("left");
      });
  }, [API_KEY, lng, lat, zoom]);

  return (
    <div className="map-wrap">
      <div ref={mapContainer} className="map" />
      <div className="container" />
      <div id="map">
        <div id="left" className="sidebar flex-center left collapsed">
          <div className="sidebar-content rounded-rect flex-center">
            <div className="sidebar-content-info">Left Sidebar</div>
            <div className="sidebar-toggle rounded-rect left">
              <span className="icon"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
