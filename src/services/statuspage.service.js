import axios from "axios";
import { STATUSPAGE_API_KEY } from "../config/envs";

const stAxios = axios.create({
  baseURL: "https://api.statuspage.io/v1",
  headers: {
    Authorization: `OAuth ${STATUSPAGE_API_KEY}`,
  },
});

const pageId = "13hf3blv8ynt"; // TIO Status Page
const componentId = "993gq6fk4yhq"; // Translation tool

const statusPageService = {
  /**
   *
   * @param {{
   *  method: string;
   *  path: string;
   *  message: string;
   * }} details
   * @returns
   */
  createEndpointIncident: async (details) => {
    if (!STATUSPAGE_API_KEY) return;
    const component = await statusPageService.getPage();
    const incidentName = `${component.name} - API Error`;
    const existingIncident =
      await statusPageService.getExistingEndpointIncident(
        incidentName,
        details.method,
        details.path
      );
    if (existingIncident) {
      try {
        const alreadyExists = existingIncident.incident_updates.findIndex(
          (v) => {
            try {
              const b = JSON.parse(v.body);
              return b.method === details.method && b.path === details.path;
            } catch (err) {
              return false;
            }
          }
        );
        if (alreadyExists !== -1) return;
        return stAxios.patch(
          `/pages/${pageId}/incidents/${existingIncident.id}`,
          {
            incident: {
              body: JSON.stringify(details),
            },
          }
        );
      } catch (err) {
        console.error(err);
        return;
      }
    } else {
      return stAxios.post(`/pages/${pageId}/incidents`, {
        incident: {
          name: incidentName,
          status: "investigating",
          impact_override: "minor",
          body: JSON.stringify(details),
          components: {
            [componentId]: "partial_outage",
          },
          component_ids: [componentId],
        },
      });
    }
  },
  getPage: async () => {
    if (!STATUSPAGE_API_KEY) return;
    return stAxios
      .get(`/pages/${pageId}/components/${componentId}`)
      .then((res) => res.data);
  },
  getExistingEndpointIncident: async (title) => {
    if (!STATUSPAGE_API_KEY) return;
    const incidents = await stAxios.get(
      `/pages/${pageId}/incidents/unresolved`
    );
    for (const incident of incidents.data) {
      if (incident.name === title) return incident;
    }
  },
};

export default statusPageService;
