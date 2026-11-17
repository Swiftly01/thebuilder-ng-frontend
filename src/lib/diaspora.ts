export const diasporaRegions: Record<
  string,
  {
    label: string;
    country?: string;
    region?: string;
    edition: "Australia" | "Nigeria";
  }
> = {
  "united-kingdom": {
    label: "United Kingdom",
    country: "United Kingdom",
    edition: "Nigeria",
  },
  "united-states": {
    label: "US",
    country: "United States",
    edition: "Nigeria",
  },
  canada: { label: "Canada", country: "Canada", edition: "Nigeria" },
  africa: { label: "Africa", region: "Africa", edition: "Nigeria" },
};

export const focusRegionPages: Record<string, string> = {
  Africa: "africa",
  UK: "united-kingdom",
  US: "united-states",
  Canada: "canada",
};
