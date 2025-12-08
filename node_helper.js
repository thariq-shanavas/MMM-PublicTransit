const NodeHelper = require("node_helper");
const { URL } = require("url"); // Ensure URL is available

module.exports = NodeHelper.create({
  async socketNotificationReceived(notification, payload) {
    
    if (!payload.activeHours) {
      //console.log("Outside active hours, skipping API Calls.");
      return; // Exit if activeHours is not defined
    }

    if (notification === "FETCH_BUS_SCHEDULE") {
      try {
        // Build the URL with query parameters
        const baseUrl = 'https://external.transitapp.com/v3/public/stop_departures';
        const url = new URL(baseUrl);
        url.searchParams.append('global_stop_ids', payload.global_stop_ids);
        url.searchParams.append('remove_cancelled', 'true');
        
        // Make the API request
        //console.log("Making API call to Transit App...");
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'apiKey': payload.apiKey,
            'Accept-Language': 'en'
          }
        });
    
        // Check if the request was successful
        if (!response.ok) {
          throw new Error(`API request failed with status: ${response.status}`);
        }
        
        // Sort the response in ascending order of departure_time
        const data = await response.json();
        const routeDepartures = data.route_departures;
        const result = [];
      
        if (routeDepartures && Array.isArray(routeDepartures)) {
          routeDepartures.forEach(route => {
            if (route.itineraries && Array.isArray(route.itineraries)) {
              route.itineraries.forEach(itinerary => {
                if (itinerary.schedule_items && Array.isArray(itinerary.schedule_items)) {
                  itinerary.schedule_items.forEach(scheduleItem => {
                      
                      // Push all available data to the frontend
                      result.push({
                        route_short_name: route.route_short_name, 
                        trip_headsign: itinerary.headsign,
                        departure_time: scheduleItem.departure_time,
                        route_id: route.real_time_route_id
                      });

                  });
                }
              });
            }
          });
        }

        // Sort the result by departure_time
        result.sort((a, b) => a.departure_time - b.departure_time);
        this.sendSocketNotification("UPDATE_BUS_SCHEDULE", result);
  
      } catch (error) {
        console.error('Error fetching bus times:', error);
      }
    }
  },
});

