import { kantoRoutesWeather } from './routes.ts';
import { kantoLandmarksWeather } from './landmarks.ts';

export const kantoWeather = {
  ...kantoRoutesWeather,
  ...kantoLandmarksWeather
};
