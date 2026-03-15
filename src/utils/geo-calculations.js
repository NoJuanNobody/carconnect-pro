'use strict';

const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_MI = 3959;

/**
 * Convert degrees to radians.
 */
const toRadians = (degrees) => (degrees * Math.PI) / 180;

/**
 * Convert radians to degrees.
 */
const toDegrees = (radians) => (radians * 180) / Math.PI;

/**
 * Calculate haversine distance between two GPS coordinates.
 * @param {object} from - { latitude, longitude }
 * @param {object} to - { latitude, longitude }
 * @param {string} unit - 'km' or 'mi'
 * @returns {number} distance in specified unit
 */
const haversineDistance = (from, to, unit = 'km') => {
  const R = unit === 'mi' ? EARTH_RADIUS_MI : EARTH_RADIUS_KM;

  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Calculate bearing from one coordinate to another.
 * @param {object} from - { latitude, longitude }
 * @param {object} to - { latitude, longitude }
 * @returns {number} bearing in degrees (0-360)
 */
const calculateBearing = (from, to) => {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
};

/**
 * Calculate ETA given distance and speed, with optional traffic multiplier.
 * @param {number} distanceKm - distance in kilometers
 * @param {number} speedKmh - speed in km/h
 * @param {number} trafficMultiplier - 1.0 = no delay, >1.0 = traffic delay
 * @returns {object} { etaMinutes, etaDate }
 */
const calculateEta = (distanceKm, speedKmh, trafficMultiplier = 1.0) => {
  if (speedKmh <= 0) {
    return { etaMinutes: Infinity, etaDate: null };
  }

  const timeHours = (distanceKm / speedKmh) * trafficMultiplier;
  const etaMinutes = Math.round(timeHours * 60);
  const etaDate = new Date(Date.now() + etaMinutes * 60 * 1000);

  return { etaMinutes, etaDate };
};

/**
 * Calculate total route distance from an array of waypoints.
 * @param {Array<object>} waypoints - array of { latitude, longitude }
 * @param {string} unit - 'km' or 'mi'
 * @returns {number} total distance
 */
const calculateRouteDistance = (waypoints, unit = 'km') => {
  if (!waypoints || waypoints.length < 2) {
    return 0;
  }

  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += haversineDistance(waypoints[i], waypoints[i + 1], unit);
  }
  return total;
};

/**
 * Determine cardinal direction from bearing.
 * @param {number} bearing - bearing in degrees
 * @returns {string} cardinal direction
 */
const bearingToDirection = (bearing) => {
  const directions = [
    'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW',
  ];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
};

/**
 * Validate GPS coordinates.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {boolean}
 */
const isValidCoordinate = (latitude, longitude) => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  );
};

module.exports = {
  EARTH_RADIUS_KM,
  EARTH_RADIUS_MI,
  toRadians,
  toDegrees,
  haversineDistance,
  calculateBearing,
  calculateEta,
  calculateRouteDistance,
  bearingToDirection,
  isValidCoordinate,
};
