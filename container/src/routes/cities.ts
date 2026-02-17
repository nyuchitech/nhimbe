/**
 * Cities static data route
 */

import { Hono } from "hono";

const cities = new Hono();

// GET /api/cities
cities.get("/", (c) => {
  const cityList = [
    { city: "Harare", country: "Zimbabwe" },
    { city: "Bulawayo", country: "Zimbabwe" },
    { city: "Victoria Falls", country: "Zimbabwe" },
    { city: "Johannesburg", country: "South Africa" },
    { city: "Cape Town", country: "South Africa" },
    { city: "Nairobi", country: "Kenya" },
    { city: "Lagos", country: "Nigeria" },
    { city: "Accra", country: "Ghana" },
  ];

  return c.json({ cities: cityList });
});

export default cities;
