// [PureVue-Ignore-Length]
export const ROUTE_WEATHER_TABLES: Record<string, Record<string, Record<string, Record<string, number>>>> = {
  "route1": {
    "spring": {
      "morning": { "clear": 30, "rain": 10, "fog": 20, "wind": 30, "mist": 10 },
      "day": { "clear": 50, "rain": 15, "fog": 10, "wind": 25 },
      "dusk": { "clear": 30, "rain": 15, "fog": 25, "wind": 30 },
      "night": { "clear": 40, "rain": 10, "fog": 20, "wind": 30 }
    },
    "summer": {
      "morning": { "clear": 60, "heatwave": 10, "rain": 10, "sun": 10, "wind": 10 },
      "day": { "clear": 50, "heatwave": 20, "rain": 5, "intense_sun": 15, "wind": 10 },
      "dusk": { "clear": 60, "rain": 20, "storm": 10, "wind": 10 },
      "night": { "clear": 70, "rain": 15, "storm": 5, "wind": 10 }
    },
    "autumn": {
      "morning": { "clear": 25, "rain": 15, "storm": 20, "fog": 10, "wind": 20, "strong_winds": 10 },
      "day": { "clear": 40, "rain": 20, "storm": 10, "heavy_rain": 10, "wind": 10, "strong_winds": 10 },
      "dusk": { "clear": 25, "rain": 20, "storm": 15, "fog": 10, "wind": 20, "strong_winds": 10 },
      "night": { "clear": 40, "rain": 15, "storm": 10, "fog": 10, "wind": 15, "strong_winds": 10 }
    },
    "winter": {
      "morning": { "clear": 30, "snow": 10, "fog": 15, "cold": 30, "coldwave": 15 },
      "day": { "clear": 45, "snow": 15, "fog": 5, "cold": 25, "coldwave": 10 },
      "dusk": { "clear": 30, "snow": 10, "fog": 15, "cold": 30, "coldwave": 15 },
      "night": { "clear": 40, "snow": 10, "fog": 10, "cold": 25, "coldwave": 15 }
    }
  },
  "route2": {
    "spring": {
      "morning": { "clear": 40, "rain": 10, "fog": 20, "wind": 20, "mist": 10 },
      "day": { "clear": 55, "rain": 15, "fog": 10, "wind": 20 },
      "dusk": { "clear": 35, "rain": 15, "fog": 25, "wind": 25 },
      "night": { "clear": 45, "rain": 10, "fog": 20, "wind": 25 }
    },
    "summer": {
      "morning": { "clear": 70, "heatwave": 5, "rain": 10, "sun": 10, "wind": 5 },
      "day": { "clear": 60, "heatwave": 15, "rain": 5, "intense_sun": 10, "wind": 10 },
      "dusk": { "clear": 70, "rain": 15, "storm": 5, "wind": 10 },
      "night": { "clear": 80, "rain": 10, "storm": 5, "wind": 5 }
    },
    "autumn": {
      "morning": { "clear": 30, "rain": 15, "storm": 15, "fog": 15, "wind": 15, "strong_winds": 10 },
      "day": { "clear": 50, "rain": 20, "storm": 5, "heavy_rain": 5, "wind": 10, "strong_winds": 10 },
      "dusk": { "clear": 30, "rain": 20, "storm": 10, "fog": 15, "wind": 15, "strong_winds": 10 },
      "night": { "clear": 50, "rain": 15, "storm": 5, "fog": 10, "wind": 10, "strong_winds": 10 }
    },
    "winter": {
      "morning": { "clear": 40, "snow": 10, "fog": 20, "cold": 20, "coldwave": 10 },
      "day": { "clear": 60, "snow": 15, "fog": 5, "cold": 15, "coldwave": 5 },
      "dusk": { "clear": 40, "snow": 10, "fog": 20, "cold": 20, "coldwave": 10 },
      "night": { "clear": 50, "snow": 10, "fog": 15, "cold": 15, "coldwave": 10 }
    }
  },
  "forest": {
    "spring": {
      "morning": { "fog": 40, "mist": 30, "clear": 20, "rain": 10 },
      "day": { "fog": 25, "mist": 20, "clear": 40, "rain": 15 },
      "dusk": { "fog": 40, "mist": 25, "clear": 20, "rain": 15 },
      "night": { "fog": 30, "mist": 30, "clear": 30, "rain": 10 }
    },
    "summer": {
      "morning": { "clear": 30, "fog": 40, "mist": 20, "rain": 10 },
      "day": { "clear": 50, "fog": 20, "mist": 20, "rain": 10 },
      "dusk": { "clear": 30, "fog": 40, "mist": 20, "rain": 10 },
      "night": { "clear": 50, "fog": 20, "mist": 20, "rain": 10 }
    },
    "autumn": {
      "morning": { "fog": 40, "mist": 20, "rain": 15, "storm": 20, "clear": 5 },
      "day": { "fog": 35, "mist": 15, "rain": 25, "storm": 10, "clear": 15 },
      "dusk": { "fog": 40, "mist": 20, "rain": 20, "storm": 15, "clear": 5 },
      "night": { "fog": 35, "mist": 20, "rain": 20, "storm": 10, "clear": 15 }
    },
    "winter": {
      "morning": { "fog": 50, "snow": 10, "clear": 10, "cold": 20, "coldwave": 10 },
      "day": { "fog": 40, "snow": 15, "clear": 20, "cold": 15, "coldwave": 10 },
      "dusk": { "fog": 50, "snow": 10, "clear": 10, "cold": 20, "coldwave": 10 },
      "night": { "fog": 40, "snow": 15, "clear": 20, "cold": 15, "coldwave": 10 }
    }
  },
  "route22": {
    "spring": {
      "morning": { "clear": 40, "rain": 20, "wind": 30, "mist": 10 },
      "day": { "clear": 60, "rain": 20, "wind": 20 },
      "dusk": { "clear": 40, "rain": 30, "wind": 30 },
      "night": { "clear": 50, "rain": 20, "wind": 30 }
    },
    "summer": {
      "morning": { "clear": 70, "sun": 15, "wind": 15 },
      "day": { "clear": 60, "sun": 25, "wind": 15 },
      "dusk": { "clear": 75, "rain": 15, "wind": 10 },
      "night": { "clear": 80, "rain": 10, "wind": 10 }
    },
    "autumn": {
      "morning": { "clear": 30, "rain": 20, "storm": 20, "wind": 20, "strong_winds": 10 },
      "day": { "clear": 50, "rain": 20, "storm": 10, "strong_winds": 20 },
      "dusk": { "clear": 30, "rain": 20, "storm": 20, "wind": 20, "strong_winds": 10 },
      "night": { "clear": 50, "rain": 20, "storm": 10, "wind": 10, "strong_winds": 10 }
    },
    "winter": {
      "morning": { "clear": 40, "snow": 20, "cold": 30, "coldwave": 10 },
      "day": { "clear": 60, "snow": 20, "cold": 20 },
      "dusk": { "clear": 40, "snow": 20, "cold": 30, "coldwave": 10 },
      "night": { "clear": 50, "snow": 20, "cold": 20, "coldwave": 10 }
    }
  },
  "route3": {
    "spring": {
      "morning": { "clear": 40, "rain": 10, "storm": 20, "wind": 30 },
      "day": { "clear": 60, "rain": 15, "storm": 5, "wind": 20 },
      "dusk": { "clear": 40, "rain": 20, "storm": 20, "wind": 20 },
      "night": { "clear": 50, "rain": 15, "storm": 10, "wind": 25 }
    },
    "summer": {
      "morning": { "clear": 50, "heatwave": 10, "storm": 20, "wind": 20 },
      "day": { "clear": 40, "heatwave": 30, "storm": 10, "intense_sun": 20 },
      "dusk": { "clear": 50, "heatwave": 10, "storm": 20, "wind": 20 },
      "night": { "clear": 70, "heatwave": 10, "storm": 10, "wind": 10 }
    },
    "autumn": {
      "morning": { "clear": 25, "rain": 15, "storm": 30, "wind": 20, "strong_winds": 10 },
      "day": { "clear": 40, "rain": 20, "storm": 15, "heavy_rain": 15, "strong_winds": 10 },
      "dusk": { "clear": 25, "rain": 20, "storm": 25, "wind": 20, "strong_winds": 10 },
      "night": { "clear": 40, "rain": 20, "storm": 15, "wind": 15, "strong_winds": 10 }
    },
    "winter": {
      "morning": { "clear": 30, "snow": 20, "cold": 30, "coldwave": 20 },
      "day": { "clear": 50, "snow": 20, "cold": 20, "coldwave": 10 },
      "dusk": { "clear": 30, "snow": 20, "cold": 30, "coldwave": 20 },
      "night": { "clear": 40, "snow": 20, "cold": 25, "coldwave": 15 }
    }
  },
  "mt_moon": {
    "spring": {
      "morning": { "clear": 50, "fog": 30, "mist": 20 },
      "day": { "clear": 70, "fog": 15, "mist": 15 },
      "dusk": { "clear": 50, "fog": 30, "mist": 20 },
      "night": { "clear": 60, "fog": 20, "mist": 20 }
    },
    "summer": {
      "morning": { "clear": 60, "fog": 20, "mist": 20 },
      "day": { "clear": 80, "fog": 10, "mist": 10 },
      "dusk": { "clear": 60, "fog": 20, "mist": 20 },
      "night": { "clear": 70, "fog": 15, "mist": 15 }
    },
    "autumn": {
      "morning": { "clear": 40, "fog": 40, "mist": 20 },
      "day": { "clear": 60, "fog": 20, "mist": 20 },
      "dusk": { "clear": 40, "fog": 40, "mist": 20 },
      "night": { "clear": 50, "fog": 30, "mist": 20 }
    },
    "winter": {
      "morning": { "clear": 40, "fog": 30, "cold": 30 },
      "day": { "clear": 60, "fog": 20, "cold": 20 },
      "dusk": { "clear": 40, "fog": 30, "cold": 30 },
      "night": { "clear": 50, "fog": 25, "cold": 25 }
    }
  },
  "route4": {
    "spring": {
      "morning": { "clear": 50, "sandstorm": 20, "wind": 30 },
      "day": { "clear": 60, "sandstorm": 20, "wind": 20 },
      "dusk": { "clear": 50, "sandstorm": 20, "wind": 30 },
      "night": { "clear": 60, "sandstorm": 20, "wind": 20 }
    },
    "summer": {
      "morning": { "clear": 40, "heatwave": 20, "sandstorm": 20, "dust_storm": 20 },
      "day": { "clear": 30, "heatwave": 30, "sandstorm": 20, "dust_storm": 20 },
      "dusk": { "clear": 40, "heatwave": 20, "sandstorm": 20, "dust_storm": 20 },
      "night": { "clear": 60, "heatwave": 15, "sandstorm": 15, "dust_storm": 10 }
    },
    "autumn": {
      "morning": { "clear": 50, "rain": 10, "sandstorm": 20, "wind": 20 },
      "day": { "clear": 60, "rain": 10, "sandstorm": 20, "wind": 10 },
      "dusk": { "clear": 50, "rain": 10, "sandstorm": 20, "wind": 20 },
      "night": { "clear": 60, "rain": 10, "sandstorm": 20, "wind": 10 }
    },
    "winter": {
      "morning": { "clear": 50, "snow": 10, "sandstorm": 10, "cold": 20, "coldwave": 10 },
      "day": { "clear": 60, "snow": 10, "sandstorm": 10, "cold": 20 },
      "dusk": { "clear": 50, "snow": 10, "sandstorm": 10, "cold": 20, "coldwave": 10 },
      "night": { "clear": 60, "snow": 10, "sandstorm": 10, "cold": 20 }
    }
  },
  "route24": {
    "spring": {
      "morning": { "clear": 30, "rain": 20, "fog": 20, "wind": 20, "mist": 10 },
      "day": { "clear": 50, "rain": 20, "fog": 10, "wind": 20 },
      "dusk": { "clear": 30, "rain": 30, "fog": 20, "wind": 20 },
      "night": { "clear": 50, "rain": 20, "fog": 10, "wind": 20 }
    },
    "summer": {
      "morning": { "clear": 60, "rain": 20, "sun": 20 },
      "day": { "clear": 50, "rain": 20, "sun": 30 },
      "dusk": { "clear": 60, "rain": 20, "sun": 20 },
      "night": { "clear": 70, "rain": 20, "storm": 10 }
    },
    "autumn": {
      "morning": { "clear": 25, "rain": 25, "storm": 25, "strong_winds": 25 },
      "day": { "clear": 40, "rain": 30, "storm": 10, "strong_winds": 20 },
      "dusk": { "clear": 25, "rain": 30, "storm": 20, "strong_winds": 25 },
      "night": { "clear": 40, "rain": 30, "storm": 10, "strong_winds": 20 }
    },
    "winter": {
      "morning": { "clear": 50, "snow": 20, "cold": 20, "coldwave": 10 },
      "day": { "clear": 60, "snow": 20, "cold": 20 },
      "dusk": { "clear": 50, "snow": 20, "cold": 20, "coldwave": 10 },
      "night": { "clear": 60, "snow": 20, "cold": 20 }
    }
  },
  "route25": {
    "spring": {
      "morning": { "clear": 30, "rain": 20, "fog": 20, "wind": 20, "mist": 10 },
      "day": { "clear": 50, "rain": 20, "fog": 10, "wind": 20 },
      "dusk": { "clear": 30, "rain": 30, "fog": 20, "wind": 20 },
      "night": { "clear": 50, "rain": 20, "fog": 10, "wind": 20 }
    },
    "summer": {
      "morning": { "clear": 70, "rain": 20, "sun": 10 },
      "day": { "clear": 60, "rain": 20, "sun": 20 },
      "dusk": { "clear": 70, "rain": 20, "sun": 10 },
      "night": { "clear": 80, "rain": 20 }
    },
    "autumn": {
      "morning": { "clear": 25, "rain": 25, "storm": 25, "strong_winds": 25 },
      "day": { "clear": 40, "rain": 30, "storm": 10, "strong_winds": 20 },
      "dusk": { "clear": 25, "rain": 30, "storm": 20, "strong_winds": 25 },
      "night": { "clear": 40, "rain": 30, "storm": 10, "strong_winds": 20 }
    },
    "winter": {
      "morning": { "clear": 50, "snow": 30, "cold": 20 },
      "day": { "clear": 60, "snow": 25, "cold": 15 },
      "dusk": { "clear": 50, "snow": 30, "cold": 20 },
      "night": { "clear": 60, "snow": 25, "cold": 15 }
    }
  },
  "route5": {
    "spring": {
      "morning": { "clear": 40, "rain": 20, "fog": 20, "wind": 20 },
      "day": { "clear": 60, "rain": 15, "fog": 5, "wind": 20 },
      "dusk": { "clear": 40, "rain": 20, "fog": 20, "wind": 20 },
      "night": { "clear": 50, "rain": 15, "fog": 10, "wind": 25 }
    },
    "summer": {
      "morning": { "clear": 70, "sun": 20, "wind": 10 },
      "day": { "clear": 60, "sun": 30, "wind": 10 },
      "dusk": { "clear": 70, "rain": 15, "sun": 15 },
      "night": { "clear": 80, "rain": 20 }
    },
    "autumn": {
      "morning": { "clear": 30, "rain": 20, "storm": 20, "wind": 20, "strong_winds": 10 },
      "day": { "clear": 50, "rain": 20, "storm": 10, "strong_winds": 20 },
      "dusk": { "clear": 30, "rain": 20, "storm": 20, "wind": 20, "strong_winds": 10 },
      "night": { "clear": 50, "rain": 20, "storm": 10, "wind": 10, "strong_winds": 10 }
    },
    "winter": {
      "morning": { "clear": 40, "snow": 20, "cold": 30, "coldwave": 10 },
      "day": { "clear": 60, "snow": 20, "cold": 20 },
      "dusk": { "clear": 40, "snow": 20, "cold": 30, "coldwave": 10 },
      "night": { "clear": 50, "snow": 20, "cold": 20, "coldwave": 10 }
    }
  },
  "route6": {
    "spring": {
      "morning": { "clear": 40, "rain": 20, "fog": 20, "wind": 20 },
      "day": { "clear": 60, "rain": 15, "fog": 5, "wind": 20 },
      "dusk": { "clear": 40, "rain": 20, "fog": 20, "wind": 20 },
      "night": { "clear": 50, "rain": 15, "fog": 10, "wind": 25 }
    },
    "summer": {
      "morning": { "clear": 70, "sun": 20, "wind": 10 },
      "day": { "clear": 60, "sun": 30, "wind": 10 },
      "dusk": { "clear": 70, "rain": 15, "sun": 15 },
      "night": { "clear": 80, "rain": 20 }
    },
    "autumn": {
      "morning": { "clear": 30, "rain": 20, "storm": 20, "wind": 20, "strong_winds": 10 },
      "day": { "clear": 50, "rain": 20, "storm": 10, "strong_winds": 20 },
      "dusk": { "clear": 30, "rain": 20, "storm": 20, "wind": 20, "strong_winds": 10 },
      "night": { "clear": 50, "rain": 20, "storm": 10, "wind": 10, "strong_winds": 10 }
    },
    "winter": {
      "morning": { "clear": 40, "snow": 20, "cold": 30, "coldwave": 10 },
      "day": { "clear": 60, "snow": 20, "cold": 20 },
      "dusk": { "clear": 40, "snow": 20, "cold": 30, "coldwave": 10 },
      "night": { "clear": 50, "snow": 20, "cold": 20, "coldwave": 10 }
    }
  },
  "route11": {
    "spring": {
      "morning": { "clear": 40, "rain": 20, "fog": 20, "wind": 20 },
      "day": { "clear": 60, "rain": 15, "fog": 5, "wind": 20 },
      "dusk": { "clear": 40, "rain": 20, "fog": 20, "wind": 20 },
      "night": { "clear": 50, "rain": 15, "fog": 10, "wind": 25 }
    },
    "summer": {
      "morning": { "clear": 60, "sun": 10, "sandstorm": 15, "dust_storm": 15 },
      "day": { "clear": 50, "sun": 20, "sandstorm": 15, "dust_storm": 15 },
      "dusk": { "clear": 60, "rain": 15, "sun": 10, "sandstorm": 15 },
      "night": { "clear": 70, "rain": 20, "sandstorm": 10 }
    },
    "autumn": {
      "morning": { "clear": 30, "rain": 20, "storm": 20, "wind": 20, "strong_winds": 10 },
      "day": { "clear": 50, "rain": 20, "storm": 10, "strong_winds": 20 },
      "dusk": { "clear": 30, "rain": 20, "storm": 20, "wind": 20, "strong_winds": 10 },
      "night": { "clear": 50, "rain": 20, "storm": 10, "wind": 10, "strong_winds": 10 }
    },
    "winter": {
      "morning": { "clear": 40, "snow": 20, "cold": 30, "coldwave": 10 },
      "day": { "clear": 60, "snow": 20, "cold": 20 },
      "dusk": { "clear": 40, "snow": 20, "cold": 30, "coldwave": 10 },
      "night": { "clear": 50, "snow": 20, "cold": 20, "coldwave": 10 }
    }
  },
  "diglett_cave": {
    "spring": {
      "morning": { "clear": 60, "fog": 20, "mist": 20 },
      "day": { "clear": 80, "fog": 10, "mist": 10 },
      "dusk": { "clear": 60, "fog": 20, "mist": 20 },
      "night": { "clear": 80, "fog": 10, "mist": 10 }
    },
    "summer": {
      "morning": { "clear": 50, "heatwave": 30, "mist": 20 },
      "day": { "clear": 70, "heatwave": 20, "mist": 10 },
      "dusk": { "clear": 50, "heatwave": 30, "mist": 20 },
      "night": { "clear": 70, "heatwave": 20, "mist": 10 }
    },
    "autumn": {
      "morning": { "clear": 60, "fog": 30, "mist": 10 },
      "day": { "clear": 80, "fog": 15, "mist": 5 },
      "dusk": { "clear": 60, "fog": 30, "mist": 10 },
      "night": { "clear": 80, "fog": 15, "mist": 5 }
    },
    "winter": {
      "morning": { "clear": 60, "fog": 20, "cold": 20 },
      "day": { "clear": 80, "fog": 10, "cold": 10 },
      "dusk": { "clear": 60, "fog": 20, "cold": 20 },
      "night": { "clear": 80, "fog": 10, "cold": 10 }
    }
  },
  "route9": {
    "spring": {
      "morning": { "clear": 40, "rain": 10, "storm": 20, "wind": 30 },
      "day": { "clear": 60, "rain": 15, "storm": 5, "wind": 20 },
      "dusk": { "clear": 40, "rain": 20, "storm": 20, "wind": 20 },
      "night": { "clear": 50, "rain": 15, "storm": 10, "wind": 25 }
    },
    "summer": {
      "morning": { "clear": 50, "heatwave": 10, "sandstorm": 20, "dust_storm": 20 },
      "day": { "clear": 40, "heatwave": 30, "sandstorm": 10, "dust_storm": 20 },
      "dusk": { "clear": 50, "heatwave": 10, "sandstorm": 20, "dust_storm": 20 },
      "night": { "clear": 70, "heatwave": 10, "sandstorm": 10, "dust_storm": 10 }
    },
    "autumn": {
      "morning": { "clear": 25, "rain": 15, "storm": 30, "wind": 20, "strong_winds": 10 },
      "day": { "clear": 40, "rain": 20, "storm": 15, "heavy_rain": 15, "strong_winds": 10 },
      "dusk": { "clear": 25, "rain": 20, "storm": 25, "wind": 20, "strong_winds": 10 },
      "night": { "clear": 40, "rain": 20, "storm": 15, "wind": 15, "strong_winds": 10 }
    },
    "winter": {
      "morning": { "clear": 30, "snow": 20, "cold": 30, "coldwave": 20 },
      "day": { "clear": 50, "snow": 20, "cold": 20, "coldwave": 10 },
      "dusk": { "clear": 30, "snow": 20, "cold": 30, "coldwave": 20 },
      "night": { "clear": 40, "snow": 20, "cold": 25, "coldwave": 15 }
    }
  },
  "rock_tunnel": {
    "spring": {
      "morning": { "clear": 40, "fog": 30, "mist": 30 },
      "day": { "clear": 60, "fog": 20, "mist": 20 },
      "dusk": { "clear": 40, "fog": 30, "mist": 30 },
      "night": { "clear": 50, "fog": 25, "mist": 25 }
    },
    "summer": {
      "morning": { "clear": 60, "fog": 20, "mist": 20 },
      "day": { "clear": 80, "fog": 10, "mist": 10 },
      "dusk": { "clear": 60, "fog": 20, "mist": 20 },
      "night": { "clear": 70, "fog": 15, "mist": 15 }
    },
    "autumn": {
      "morning": { "clear": 30, "fog": 35, "mist": 35 },
      "day": { "clear": 50, "fog": 25, "mist": 25 },
      "dusk": { "clear": 30, "fog": 35, "mist": 35 },
      "night": { "clear": 40, "fog": 30, "mist": 30 }
    },
    "winter": {
      "morning": { "clear": 30, "fog": 30, "cold": 20, "coldwave": 20 },
      "day": { "clear": 50, "fog": 20, "cold": 15, "coldwave": 15 },
      "dusk": { "clear": 30, "fog": 30, "cold": 20, "coldwave": 20 },
      "night": { "clear": 40, "fog": 25, "cold": 15, "coldwave": 20 }
    }
  },
  "route10": {
    "spring": {
      "morning": { "clear": 40, "rain": 20, "storm": 20, "wind": 20 },
      "day": { "clear": 60, "rain": 20, "storm": 5, "wind": 15 },
      "dusk": { "clear": 40, "rain": 30, "storm": 10, "wind": 20 },
      "night": { "clear": 50, "rain": 20, "storm": 10, "wind": 20 }
    },
    "summer": {
      "morning": { "clear": 60, "sun": 20, "wind": 20 },
      "day": { "clear": 50, "sun": 30, "wind": 20 },
      "dusk": { "clear": 60, "rain": 20, "sun": 20 },
      "night": { "clear": 70, "rain": 20, "storm": 10 }
    },
    "autumn": {
      "morning": { "clear": 25, "rain": 25, "storm": 25, "strong_winds": 25 },
      "day": { "clear": 40, "rain": 30, "storm": 10, "strong_winds": 20 },
      "dusk": { "clear": 25, "rain": 30, "storm": 20, "strong_winds": 25 },
      "night": { "clear": 40, "rain": 30, "storm": 10, "strong_winds": 20 }
    },
    "winter": {
      "morning": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "day": { "clear": 60, "snow": 20, "cold": 20 },
      "dusk": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "night": { "clear": 50, "snow": 20, "cold": 15, "coldwave": 15 }
    }
  },
  "power_plant": {
    "spring": {
      "morning": { "clear": 60, "fog": 20, "mist": 20 },
      "day": { "clear": 80, "fog": 10, "mist": 10 },
      "dusk": { "clear": 60, "fog": 20, "mist": 20 },
      "night": { "clear": 70, "fog": 15, "mist": 15 }
    },
    "summer": {
      "morning": { "clear": 50, "heatwave": 30, "mist": 20 },
      "day": { "clear": 40, "heatwave": 50, "mist": 10 },
      "dusk": { "clear": 50, "heatwave": 30, "mist": 20 },
      "night": { "clear": 60, "heatwave": 20, "mist": 20 }
    },
    "autumn": {
      "morning": { "clear": 40, "fog": 40, "mist": 20 },
      "day": { "clear": 60, "fog": 20, "mist": 20 },
      "dusk": { "clear": 40, "fog": 40, "mist": 20 },
      "night": { "clear": 50, "fog": 30, "mist": 20 }
    },
    "winter": {
      "morning": { "clear": 50, "fog": 30, "cold": 20 },
      "day": { "clear": 70, "fog": 20, "cold": 10 },
      "dusk": { "clear": 50, "fog": 30, "cold": 20 },
      "night": { "clear": 60, "fog": 25, "cold": 15 }
    }
  },
  "route8": {
    "spring": {
      "morning": { "clear": 40, "rain": 20, "fog": 20, "wind": 20 },
      "day": { "clear": 60, "rain": 15, "fog": 5, "wind": 20 },
      "dusk": { "clear": 40, "rain": 20, "fog": 20, "wind": 20 },
      "night": { "clear": 50, "rain": 15, "fog": 10, "wind": 25 }
    },
    "summer": {
      "morning": { "clear": 70, "sun": 20, "wind": 10 },
      "day": { "clear": 60, "sun": 30, "wind": 10 },
      "dusk": { "clear": 70, "rain": 15, "sun": 15 },
      "night": { "clear": 80, "rain": 20 }
    },
    "autumn": {
      "morning": { "clear": 30, "rain": 20, "storm": 20, "wind": 20, "strong_winds": 10 },
      "day": { "clear": 50, "rain": 20, "storm": 10, "strong_winds": 20 },
      "dusk": { "clear": 30, "rain": 20, "storm": 20, "wind": 20, "strong_winds": 10 },
      "night": { "clear": 50, "rain": 20, "storm": 10, "wind": 10, "strong_winds": 10 }
    },
    "winter": {
      "morning": { "clear": 40, "snow": 20, "cold": 30, "coldwave": 10 },
      "day": { "clear": 60, "snow": 20, "cold": 20 },
      "dusk": { "clear": 40, "snow": 20, "cold": 30, "coldwave": 10 },
      "night": { "clear": 50, "snow": 20, "cold": 20, "coldwave": 10 }
    }
  },
  "pokemon_tower": {
    "spring": {
      "morning": { "fog": 40, "mist": 30, "clear": 30 },
      "day": { "fog": 30, "mist": 20, "clear": 50 },
      "dusk": { "fog": 40, "mist": 30, "clear": 30 },
      "night": { "fog": 50, "mist": 30, "clear": 20 }
    },
    "summer": {
      "morning": { "fog": 30, "mist": 20, "clear": 50 },
      "day": { "fog": 20, "mist": 10, "clear": 70 },
      "dusk": { "fog": 30, "mist": 20, "clear": 50 },
      "night": { "fog": 40, "mist": 30, "clear": 30 }
    },
    "autumn": {
      "morning": { "fog": 50, "mist": 30, "clear": 20 },
      "day": { "fog": 40, "mist": 20, "clear": 40 },
      "dusk": { "fog": 50, "mist": 30, "clear": 20 },
      "night": { "fog": 60, "mist": 30, "clear": 10 }
    },
    "winter": {
      "morning": { "fog": 40, "mist": 20, "cold": 20, "coldwave": 20 },
      "day": { "fog": 30, "mist": 20, "cold": 20, "clear": 30 },
      "dusk": { "fog": 40, "mist": 20, "cold": 20, "coldwave": 20 },
      "night": { "fog": 50, "mist": 20, "cold": 15, "coldwave": 15 }
    }
  },
  "route12": {
    "spring": {
      "morning": { "clear": 30, "rain": 20, "fog": 20, "wind": 20, "mist": 10 },
      "day": { "clear": 50, "rain": 20, "fog": 10, "wind": 20 },
      "dusk": { "clear": 30, "rain": 30, "fog": 20, "wind": 20 },
      "night": { "clear": 50, "rain": 20, "fog": 10, "wind": 20 }
    },
    "summer": {
      "morning": { "clear": 60, "rain": 20, "sun": 20 },
      "day": { "clear": 50, "rain": 20, "sun": 30 },
      "dusk": { "clear": 60, "rain": 20, "sun": 20 },
      "night": { "clear": 70, "rain": 20, "storm": 10 }
    },
    "autumn": {
      "morning": { "clear": 25, "rain": 25, "storm": 25, "strong_winds": 25 },
      "day": { "clear": 40, "rain": 30, "storm": 10, "strong_winds": 20 },
      "dusk": { "clear": 25, "rain": 30, "storm": 20, "strong_winds": 25 },
      "night": { "clear": 40, "rain": 30, "storm": 10, "strong_winds": 20 }
    },
    "winter": {
      "morning": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "day": { "clear": 60, "snow": 20, "cold": 20 },
      "dusk": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "night": { "clear": 50, "snow": 20, "cold": 15, "coldwave": 15 }
    }
  },
  "route13": {
    "spring": {
      "morning": { "clear": 30, "rain": 20, "fog": 20, "wind": 20, "mist": 10 },
      "day": { "clear": 50, "rain": 20, "fog": 10, "wind": 20 },
      "dusk": { "clear": 30, "rain": 30, "fog": 20, "wind": 20 },
      "night": { "clear": 50, "rain": 20, "fog": 10, "wind": 20 }
    },
    "summer": {
      "morning": { "clear": 60, "rain": 20, "sun": 20 },
      "day": { "clear": 50, "rain": 20, "sun": 30 },
      "dusk": { "clear": 60, "rain": 20, "sun": 20 },
      "night": { "clear": 70, "rain": 20, "storm": 10 }
    },
    "autumn": {
      "morning": { "clear": 25, "rain": 25, "storm": 25, "strong_winds": 25 },
      "day": { "clear": 40, "rain": 30, "storm": 10, "strong_winds": 20 },
      "dusk": { "clear": 25, "rain": 30, "storm": 20, "strong_winds": 25 },
      "night": { "clear": 40, "rain": 30, "storm": 10, "strong_winds": 20 }
    },
    "winter": {
      "morning": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "day": { "clear": 60, "snow": 20, "cold": 20 },
      "dusk": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "night": { "clear": 50, "snow": 20, "cold": 15, "coldwave": 15 }
    }
  },
  "route14": {
    "spring": {
      "morning": { "clear": 30, "rain": 20, "fog": 20, "wind": 20, "mist": 10 },
      "day": { "clear": 50, "rain": 20, "fog": 10, "wind": 20 },
      "dusk": { "clear": 30, "rain": 30, "fog": 20, "wind": 20 },
      "night": { "clear": 50, "rain": 20, "fog": 10, "wind": 20 }
    },
    "summer": {
      "morning": { "clear": 60, "rain": 20, "sun": 20 },
      "day": { "clear": 50, "rain": 20, "sun": 30 },
      "dusk": { "clear": 60, "rain": 20, "sun": 20 },
      "night": { "clear": 70, "rain": 20, "storm": 10 }
    },
    "autumn": {
      "morning": { "clear": 25, "rain": 25, "storm": 25, "strong_winds": 25 },
      "day": { "clear": 40, "rain": 30, "storm": 10, "strong_winds": 20 },
      "dusk": { "clear": 25, "rain": 30, "storm": 20, "strong_winds": 25 },
      "night": { "clear": 40, "rain": 30, "storm": 10, "strong_winds": 20 }
    },
    "winter": {
      "morning": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "day": { "clear": 60, "snow": 20, "cold": 20 },
      "dusk": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "night": { "clear": 50, "snow": 20, "cold": 15, "coldwave": 15 }
    }
  },
  "route15": {
    "spring": {
      "morning": { "clear": 30, "rain": 20, "fog": 20, "wind": 20, "mist": 10 },
      "day": { "clear": 50, "rain": 20, "fog": 10, "wind": 20 },
      "dusk": { "clear": 30, "rain": 30, "fog": 20, "wind": 20 },
      "night": { "clear": 50, "rain": 20, "fog": 10, "wind": 20 }
    },
    "summer": {
      "morning": { "clear": 60, "rain": 20, "sun": 20 },
      "day": { "clear": 50, "rain": 20, "sun": 30 },
      "dusk": { "clear": 60, "rain": 20, "sun": 20 },
      "night": { "clear": 70, "rain": 20, "storm": 10 }
    },
    "autumn": {
      "morning": { "clear": 25, "rain": 25, "storm": 25, "strong_winds": 25 },
      "day": { "clear": 40, "rain": 30, "storm": 10, "strong_winds": 20 },
      "dusk": { "clear": 25, "rain": 30, "storm": 20, "strong_winds": 25 },
      "night": { "clear": 40, "rain": 30, "storm": 10, "strong_winds": 20 }
    },
    "winter": {
      "morning": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "day": { "clear": 60, "snow": 20, "cold": 20 },
      "dusk": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "night": { "clear": 50, "snow": 20, "cold": 15, "coldwave": 15 }
    }
  },
  "route16": {
    "spring": {
      "morning": { "clear": 40, "rain": 20, "fog": 20, "wind": 20 },
      "day": { "clear": 60, "rain": 15, "fog": 5, "wind": 20 },
      "dusk": { "clear": 40, "rain": 20, "fog": 20, "wind": 20 },
      "night": { "clear": 50, "rain": 15, "fog": 10, "wind": 25 }
    },
    "summer": {
      "morning": { "clear": 60, "sun": 20, "heatwave": 10, "wind": 10 },
      "day": { "clear": 50, "sun": 25, "heatwave": 15, "wind": 10 },
      "dusk": { "clear": 60, "rain": 15, "sun": 15, "wind": 10 },
      "night": { "clear": 70, "rain": 20, "storm": 10 }
    },
    "autumn": {
      "morning": { "clear": 30, "rain": 20, "storm": 20, "wind": 20, "strong_winds": 10 },
      "day": { "clear": 50, "rain": 20, "storm": 10, "strong_winds": 20 },
      "dusk": { "clear": 30, "rain": 20, "storm": 20, "wind": 20, "strong_winds": 10 },
      "night": { "clear": 50, "rain": 20, "storm": 10, "wind": 10, "strong_winds": 10 }
    },
    "winter": {
      "morning": { "clear": 40, "snow": 20, "cold": 30, "coldwave": 10 },
      "day": { "clear": 60, "snow": 20, "cold": 20 },
      "dusk": { "clear": 40, "snow": 20, "cold": 30, "coldwave": 10 },
      "night": { "clear": 50, "snow": 20, "cold": 20, "coldwave": 10 }
    }
  },
  "route17": {
    "spring": {
      "morning": { "clear": 30, "rain": 20, "fog": 20, "wind": 30 },
      "day": { "clear": 50, "rain": 20, "wind": 30 },
      "dusk": { "clear": 30, "rain": 20, "fog": 20, "wind": 30 },
      "night": { "clear": 50, "rain": 20, "wind": 30 }
    },
    "summer": {
      "morning": { "clear": 40, "heatwave": 30, "intense_sun": 30 },
      "day": { "clear": 30, "heatwave": 40, "intense_sun": 30 },
      "dusk": { "clear": 40, "heatwave": 30, "intense_sun": 30 },
      "night": { "clear": 60, "heatwave": 20, "storm": 20 }
    },
    "autumn": {
      "morning": { "clear": 30, "rain": 20, "storm": 20, "strong_winds": 30 },
      "day": { "clear": 40, "rain": 20, "storm": 10, "strong_winds": 30 },
      "dusk": { "clear": 30, "rain": 20, "storm": 20, "strong_winds": 30 },
      "night": { "clear": 50, "rain": 20, "strong_winds": 30 }
    },
    "winter": {
      "morning": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "day": { "clear": 60, "snow": 20, "cold": 20 },
      "dusk": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "night": { "clear": 50, "snow": 20, "cold": 20, "coldwave": 10 }
    }
  },
  "route18": {
    "spring": {
      "morning": { "clear": 30, "rain": 20, "fog": 20, "wind": 30 },
      "day": { "clear": 50, "rain": 20, "wind": 30 },
      "dusk": { "clear": 30, "rain": 20, "fog": 20, "wind": 30 },
      "night": { "clear": 50, "rain": 20, "wind": 30 }
    },
    "summer": {
      "morning": { "clear": 40, "heatwave": 30, "intense_sun": 30 },
      "day": { "clear": 30, "heatwave": 40, "intense_sun": 30 },
      "dusk": { "clear": 40, "heatwave": 30, "intense_sun": 30 },
      "night": { "clear": 60, "heatwave": 20, "storm": 20 }
    },
    "autumn": {
      "morning": { "clear": 30, "rain": 20, "storm": 20, "strong_winds": 30 },
      "day": { "clear": 40, "rain": 20, "storm": 10, "strong_winds": 30 },
      "dusk": { "clear": 30, "rain": 20, "storm": 20, "strong_winds": 30 },
      "night": { "clear": 50, "rain": 20, "strong_winds": 30 }
    },
    "winter": {
      "morning": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "day": { "clear": 60, "snow": 20, "cold": 20 },
      "dusk": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "night": { "clear": 50, "snow": 20, "cold": 20, "coldwave": 10 }
    }
  },
  "safari_zone": {
    "spring": {
      "morning": { "clear": 30, "rain": 20, "fog": 20, "wind": 20, "mist": 10 },
      "day": { "clear": 40, "rain": 20, "sun": 20, "wind": 20 },
      "dusk": { "clear": 30, "rain": 20, "fog": 25, "wind": 25 },
      "night": { "clear": 50, "rain": 20, "fog": 15, "mist": 15 }
    },
    "summer": {
      "morning": { "clear": 40, "sun": 20, "heatwave": 20, "intense_sun": 20 },
      "day": { "clear": 30, "sun": 30, "heatwave": 20, "intense_sun": 20 },
      "dusk": { "clear": 40, "sun": 20, "heatwave": 20, "intense_sun": 20 },
      "night": { "clear": 60, "rain": 20, "storm": 20 }
    },
    "autumn": {
      "morning": { "clear": 25, "rain": 25, "storm": 25, "wind": 25 },
      "day": { "clear": 30, "rain": 30, "heavy_rain": 20, "strong_winds": 20 },
      "dusk": { "clear": 25, "rain": 25, "storm": 25, "wind": 25 },
      "night": { "clear": 40, "rain": 20, "storm": 20, "wind": 20 }
    },
    "winter": {
      "morning": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "day": { "clear": 50, "snow": 20, "cold": 20, "coldwave": 10 },
      "dusk": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "night": { "clear": 50, "snow": 20, "cold": 15, "coldwave": 15 }
    }
  },
  "seafoam_islands": {
    "spring": {
      "morning": { "cold": 40, "coldwave": 30, "fog": 20, "clear": 10 },
      "day": { "cold": 30, "coldwave": 20, "fog": 10, "clear": 40 },
      "dusk": { "cold": 40, "coldwave": 30, "fog": 20, "clear": 10 },
      "night": { "cold": 50, "coldwave": 30, "fog": 10, "clear": 10 }
    },
    "summer": {
      "morning": { "cold": 30, "coldwave": 20, "clear": 50 },
      "day": { "cold": 20, "coldwave": 10, "clear": 70 },
      "dusk": { "cold": 30, "coldwave": 20, "clear": 50 },
      "night": { "cold": 40, "coldwave": 20, "clear": 40 }
    },
    "autumn": {
      "morning": { "cold": 50, "coldwave": 30, "fog": 20 },
      "day": { "cold": 40, "coldwave": 20, "fog": 15, "clear": 25 },
      "dusk": { "cold": 50, "coldwave": 30, "fog": 20 },
      "night": { "cold": 60, "coldwave": 40 }
    },
    "winter": {
      "morning": { "cold": 40, "coldwave": 40, "mist": 20 },
      "day": { "cold": 30, "coldwave": 30, "mist": 20, "clear": 20 },
      "dusk": { "cold": 40, "coldwave": 40, "mist": 20 },
      "night": { "cold": 30, "coldwave": 50, "mist": 20 }
    }
  },
  "mansion": {
    "spring": {
      "morning": { "clear": 40, "fog": 40, "mist": 20 },
      "day": { "clear": 60, "fog": 20, "mist": 20 },
      "dusk": { "clear": 40, "fog": 40, "mist": 20 },
      "night": { "clear": 50, "fog": 30, "mist": 20 }
    },
    "summer": {
      "morning": { "clear": 50, "heatwave": 30, "fog": 20 },
      "day": { "clear": 40, "heatwave": 50, "fog": 10 },
      "dusk": { "clear": 50, "heatwave": 30, "fog": 20 },
      "night": { "clear": 60, "heatwave": 20, "fog": 20 }
    },
    "autumn": {
      "morning": { "clear": 30, "fog": 50, "mist": 20 },
      "day": { "clear": 50, "fog": 30, "mist": 20 },
      "dusk": { "clear": 30, "fog": 50, "mist": 20 },
      "night": { "clear": 40, "fog": 40, "mist": 20 }
    },
    "winter": {
      "morning": { "clear": 30, "fog": 40, "cold": 30 },
      "day": { "clear": 50, "fog": 20, "cold": 30 },
      "dusk": { "clear": 30, "fog": 40, "cold": 30 },
      "night": { "clear": 40, "fog": 30, "cold": 30 }
    }
  },
  "route23": {
    "spring": {
      "morning": { "clear": 30, "rain": 20, "wind": 30, "mist": 20 },
      "day": { "clear": 50, "rain": 20, "wind": 30 },
      "dusk": { "clear": 30, "rain": 30, "wind": 40 },
      "night": { "clear": 50, "rain": 20, "wind": 30 }
    },
    "summer": {
      "morning": { "clear": 50, "heatwave": 20, "sun": 30 },
      "day": { "clear": 40, "heatwave": 30, "sun": 30 },
      "dusk": { "clear": 50, "heatwave": 20, "sun": 30 },
      "night": { "clear": 70, "heatwave": 10, "storm": 20 }
    },
    "autumn": {
      "morning": { "clear": 25, "rain": 25, "storm": 25, "strong_winds": 25 },
      "day": { "clear": 40, "rain": 20, "storm": 10, "strong_winds": 30 },
      "dusk": { "clear": 25, "rain": 30, "storm": 20, "strong_winds": 25 },
      "night": { "clear": 40, "rain": 30, "storm": 10, "strong_winds": 20 }
    },
    "winter": {
      "morning": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "day": { "clear": 60, "snow": 20, "cold": 20 },
      "dusk": { "clear": 40, "snow": 20, "cold": 20, "coldwave": 20 },
      "night": { "clear": 50, "snow": 20, "cold": 15, "coldwave": 15 }
    }
  },
  "victory_road": {
    "spring": {
      "morning": { "clear": 50, "fog": 30, "mist": 20 },
      "day": { "clear": 70, "fog": 15, "mist": 15 },
      "dusk": { "clear": 50, "fog": 30, "mist": 20 },
      "night": { "clear": 60, "fog": 20, "mist": 20 }
    },
    "summer": {
      "morning": { "clear": 40, "heatwave": 30, "mist": 30 },
      "day": { "clear": 50, "heatwave": 40, "mist": 10 },
      "dusk": { "clear": 40, "heatwave": 30, "mist": 30 },
      "night": { "clear": 60, "heatwave": 20, "mist": 20 }
    },
    "autumn": {
      "morning": { "clear": 40, "fog": 40, "mist": 20 },
      "day": { "clear": 60, "fog": 20, "mist": 20 },
      "dusk": { "clear": 40, "fog": 40, "mist": 20 },
      "night": { "clear": 50, "fog": 30, "mist": 20 }
    },
    "winter": {
      "morning": { "clear": 30, "fog": 30, "cold": 40 },
      "day": { "clear": 50, "fog": 20, "cold": 30 },
      "dusk": { "clear": 30, "fog": 30, "cold": 40 },
      "night": { "clear": 40, "fog": 25, "cold": 35 }
    }
  },
  "cerulean_cave": {
    "spring": {
      "morning": { "clear": 40, "fog": 30, "mist": 30 },
      "day": { "clear": 60, "fog": 20, "mist": 20 },
      "dusk": { "clear": 40, "fog": 30, "mist": 30 },
      "night": { "clear": 50, "fog": 25, "mist": 25 }
    },
    "summer": {
      "morning": { "clear": 60, "fog": 20, "mist": 20 },
      "day": { "clear": 80, "fog": 10, "mist": 10 },
      "dusk": { "clear": 60, "fog": 20, "mist": 20 },
      "night": { "clear": 70, "fog": 15, "mist": 15 }
    },
    "autumn": {
      "morning": { "clear": 30, "fog": 35, "mist": 35 },
      "day": { "clear": 50, "fog": 25, "mist": 25 },
      "dusk": { "clear": 30, "fog": 35, "mist": 35 },
      "night": { "clear": 40, "fog": 30, "mist": 30 }
    },
    "winter": {
      "morning": { "clear": 30, "fog": 30, "cold": 20, "coldwave": 20 },
      "day": { "clear": 50, "fog": 20, "cold": 15, "coldwave": 15 },
      "dusk": { "clear": 30, "fog": 30, "cold": 20, "coldwave": 20 },
      "night": { "clear": 40, "fog": 25, "cold": 15, "coldwave": 20 }
    }
  }
};
