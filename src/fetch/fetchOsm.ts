import { toMercator } from "@turf/projection";
import { getMapBoundsPolygon, MapBounds } from "../mapUtils";
import * as turf from "turf";
import { OsmElement, OsmFetchError, OSMResponse, OsmType } from "./types";
import {
  Coordinates,
  PolygonGeometry,
  RoadGeometry,
} from "../pages/raster/types";

const HIGHWAY_WHITELIST = [
  "residential",
  "primary",
  "secondary",
  "tertiary",
  "trunk",
  "motorway",
];

async function fetchOsm(url: string) {
  const responseJson = await fetch(url).then((response) => {
    if (response.status !== 200) {
      alert("Unable to fetch OSM data for this location.");
      throw new OsmFetchError(response.statusText);
    }
    return response.json();
  });
  if (responseJson.elements.length === 0 && responseJson.remark) {
    alert(`Unable to fetch OSM data for this location: ${responseJson.remark}`);
    throw new OsmFetchError(responseJson.remark);
  }
  return responseJson;
}

async function fetchParksGivenBounds({
  latMin,
  latMax,
  lonMin,
  lonMax,
}: MapBounds) {
  const requestUrl = `https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];(way['leisure'='park'](${latMin},${lonMin},${latMax},${lonMax}););out body;>;out skel qt;`;
  return fetchOsm(requestUrl);
}

async function fetchDataTypeGivenBounds(
  dataType: string,
  { latMin, latMax, lonMin, lonMax }: MapBounds
) {
  const requestUrl = `https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];(way['${dataType}'](${latMin},${lonMin},${latMax},${lonMax}););out body;>;out skel qt;`;
  return fetchOsm(requestUrl);
}

function getPolygonGeometry(
  element: OsmElement,
  nodeIdToLatLon: Map<number, [number, number]>
): Coordinates {
  let coordinates: Coordinates = [];
  if (element.type === "way") {
    element.nodes.forEach((value) => {
      const latLon = nodeIdToLatLon.get(value);
      if (latLon !== undefined) {
        coordinates.push(latLon);
      }
    });
  }
  return coordinates;
}

function getRoadGeometry(
  element: OsmElement,
  nodeIdToLatLon: Map<number, [number, number]>
): Coordinates {
  let coordinates: Coordinates = [];
  if (element.type === "way") {
    if (
      element.tags.highway !== undefined &&
      HIGHWAY_WHITELIST.includes(element.tags.highway)
    ) {
      element.nodes.forEach((value) => {
        const latLon = nodeIdToLatLon.get(value);
        if (latLon !== undefined) {
          coordinates.push(latLon);
        }
      });
    }
  }
  return coordinates;
}

async function fetchOsmPolygonsFromBounds(bounds: MapBounds, type: OsmType) {
  let elements;
  if (type === OsmType.BUILDING) {
    elements = await fetchDataTypeGivenBounds(type, bounds).then(
      (response: OSMResponse) => response.elements
    );
  } else {
    elements = await fetchParksGivenBounds(bounds).then(
      (response: OSMResponse) => response.elements
    );
  }
  const nodeIdToLatLon = new Map<number, [number, number]>();
  elements.forEach((node) => {
    if (node.type === "node") nodeIdToLatLon.set(node.id, [node.lat, node.lon]);
  });
  const geometries = elements.map((element) => {
    return getPolygonGeometry(element, nodeIdToLatLon);
  });
  const nonEmptyBuildingElements = geometries.filter(
    (geometry) => geometry.length > 0
  );
  return nonEmptyBuildingElements;
}

export async function fetchOsmBuildings(
  bounds: MapBounds,
  setOsmBuildings: React.Dispatch<React.SetStateAction<Coordinates[]>>
) {
  const buildingGeometries = await fetchOsmPolygonsFromBounds(
    bounds,
    OsmType.BUILDING
  );
  setOsmBuildings(buildingGeometries);
}

export async function fetchOsmRoads(
  bounds: MapBounds,
  setOsmRoads: React.Dispatch<React.SetStateAction<RoadGeometry[]>>
) {
  const turfBoundsPolygon = getMapBoundsPolygon(bounds);
  const turfBoundsPolygonMercator = toMercator(turfBoundsPolygon);

  const elements = await fetchDataTypeGivenBounds(OsmType.ROAD, bounds).then(
    (response: OSMResponse) => response.elements
  );
  const nodeIdToLatLon = new Map<number, [number, number]>();
  elements.forEach((node) => {
    if (node.type === "node") nodeIdToLatLon.set(node.id, [node.lat, node.lon]);
  });
  const roadElements = elements.map((element) => {
    return getRoadGeometry(element, nodeIdToLatLon);
  });
  const nonEmptyRoadElements = roadElements.filter((road) => road.length > 0);
  const roadLinesMercator = nonEmptyRoadElements.map((coordinates) =>
    turf.intersect(
      toMercator(turf.lineString(coordinates)),
      turfBoundsPolygonMercator
    )
  );
  setOsmRoads(roadLinesMercator);
}

export async function fetchOsmVegetation(
  bounds: MapBounds,
  setOsmVegetation: React.Dispatch<React.SetStateAction<PolygonGeometry[]>>
) {
  const turfBoundsPolygon = getMapBoundsPolygon(bounds);
  const turfBoundsPolygonMercator = toMercator(turfBoundsPolygon);

  const vegetationGeometries = await fetchOsmPolygonsFromBounds(
    bounds,
    OsmType.PARK
  );
  const vegetationGeometriesMercator = vegetationGeometries.map(
    (coordinates) =>
      turf.intersect(
        toMercator(turf.polygon([coordinates])),
        turfBoundsPolygonMercator
      ) as PolygonGeometry
  );
  setOsmVegetation(vegetationGeometriesMercator);
}
