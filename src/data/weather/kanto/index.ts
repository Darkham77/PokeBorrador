import { kantoRoutesWeather } from './routes';
import { kantoLandmarksWeather } from './landmarks';

export const kantoWeather = {
  ...kantoRoutesWeather,
  ...kantoLandmarksWeather
};
