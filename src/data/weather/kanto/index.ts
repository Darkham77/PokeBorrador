import { kantoLandmarksWeather } from './landmarks.ts';
import { kantoRoutesWeather } from './routes.ts';

export const kantoWeather = {
  ...kantoRoutesWeather,
  ...kantoLandmarksWeather
};
