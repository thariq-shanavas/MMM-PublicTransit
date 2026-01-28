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
        // Parse global_stop_ids and make a request for each stop
        const stopIds = payload.global_stop_ids.split(',').map(id => id.trim());
        const result = [];
        
        for (const stopId of stopIds) {
          const baseUrl = 'https://external.transitapp.com/v3/public/stop_departures';
          const url = new URL(baseUrl);
          url.searchParams.append('global_stop_ids', stopId);
          url.searchParams.append('remove_cancelled', 'true');
          
          // Make the API request
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
          
          const data = await response.json();
          const routeDepartures = data.route_departures;
          const stop = data.stop;
          const stopName = stop ? stop.name : stopId;
        
          if (routeDepartures && Array.isArray(routeDepartures)) {
            routeDepartures.forEach(route => {
              if (route.itineraries && Array.isArray(route.itineraries)) {
                route.itineraries.forEach(itinerary => {
                  if (itinerary.schedule_items && Array.isArray(itinerary.schedule_items)) {
                    itinerary.schedule_items.forEach(scheduleItem => {
                        
                        // Push all available data to the frontend including stop info
                        result.push({
                          global_stop_id: stopId,
                          stop_name: stopName,
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

