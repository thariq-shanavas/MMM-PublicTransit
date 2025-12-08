Module.register("MMM-PublicTransit", {
  defaults: {
    logosize: "40px",
    showlogo: true,
    global_stop_ids: "",
    apiKey: "",
    displayed_entries: 3, // Number of bus times to display
    fontsize: "24px", // Font size for bus times
    logoLocation: "flex-end", // Logo alignment (flex-start, flex-end)
    activeHoursStart: 6,  // Active hours for the module (24-hour format)
    activeHoursEnd: 22,
    activeDays: [0, 1, 2, 3, 4, 5, 6], // Active days of the week (0 = Sunday, 6 = Saturday)
    updateFrequency: 30, // Update frequency in minutes
    showHeadSign: false, // If true: shows "Number + Name". If false: shows "Number".
    showTime: false // If true: shows absolute time (e.g. 12:45pm) next to minutes.
  },

  getStyles() {
    return ["publictransit.css"];
  },

  /**
   * Pseudo-constructor for our module. Initialize stuff here.
   */
  start() {
    this.busSchedule = [{ route_short_name: "Loading...", departure_time: Date.now() / 1000 + 60, trip_headsign: "" }];

    this.sendSocketNotification("FETCH_BUS_SCHEDULE", {
      apiKey: this.config.apiKey,
      global_stop_ids: this.config.global_stop_ids,
      showHeadSign: this.config.showHeadSign,
      activeHours: this.activeHours()
    });

    setInterval(
      () =>
        this.sendSocketNotification("FETCH_BUS_SCHEDULE", {
          apiKey: this.config.apiKey,
          global_stop_ids: this.config.global_stop_ids,
          showHeadSign: this.config.showHeadSign,
          activeHours: this.activeHours()
        }),
      this.config.updateFrequency * 60 * 1000
    );
    setInterval(() => this.updateDom(), 30000);
  },

  notificationReceived(notification, payload) {},

  socketNotificationReceived: function (notification, payload) {
    if (notification === "UPDATE_BUS_SCHEDULE") {
      this.busSchedule = payload;
      this.updateDom();
    }
  },

  getDom() {
    // Create the main container div
    const container = document.createElement("div");
    container.style.display = "flex"; // Use flexbox for layout
    container.style.flexDirection = "column"; // Stack items vertically
    container.style.fontSize = this.config.fontsize; // Set font size

    // Create a div for bus times
    const busTimesContainer = document.createElement("div");
    busTimesContainer.style.flexGrow = "1"; // Allow bus times to take up remaining space

    if (!this.config.apiKey) {
      busTimesContainer.innerHTML = "API Key Required";
      container.appendChild(busTimesContainer);
      return container; // Return early
    }

    if (!this.activeHours()) {
      busTimesContainer.innerHTML = "<p style='color:#555'>Inactive</p>";
      container.appendChild(busTimesContainer);
      return container; // Return early if outside active hours
    }

    let i = 0;
    let j = 0;
    while (i < this.busSchedule.length && j < this.config.displayed_entries) {
      let stop = this.busSchedule[i];

      // Filter out past buses (tolerance -2 min)
      if (Math.round((stop.departure_time - Date.now() / 1000) / 60) < -2) {
        i++;
        continue;
      }

      const busTimeContainer = document.createElement("div");
      const routeInfo = document.createElement("p");
      routeInfo.style.margin = "0";
      routeInfo.style.color = "white"; // Set color to white
      routeInfo.style.display = "flex"; // Use flexbox to align items
      routeInfo.style.justifyContent = "space-between"; // Distribute space between items
      routeInfo.style.borderBottom = "1px solid #333";
      routeInfo.style.marginBottom = "2px";

      // --- LEFT SIDE: Route Number + Headsign ---
      const routeName = document.createElement("span");
      routeName.style.textAlign = "left";

      // 1. Get Route Number (fallback to route_id if short_name is empty)
      let busNumber = stop.route_short_name || stop.route_id || "?";

      // Add dynamic class for CSS coloring (e.g. .route-100) -> UPDATED HERE
      routeName.className = "route-" + String(busNumber).replace(/\s/g, "");

      // 2. Logic to display Headsign
      let headSignHTML = "";

      // Only append headsign if config is true and it's different from the number
      if (this.config.showHeadSign && stop.trip_headsign && stop.trip_headsign !== busNumber) {
        headSignHTML = ' <span class="headsign">' + stop.trip_headsign + "</span>";
      }

      routeName.innerHTML = busNumber + headSignHTML;

      // --- RIGHT SIDE: Minutes + Absolute Time ---
      const departureTime = document.createElement("span");
      departureTime.style.textAlign = "right";
      departureTime.className = "arrival-time";

      let minutes = Math.round((stop.departure_time - Date.now() / 1000) / 60);

      let timeHTML = minutes + " min";

      // Add absolute time if enabled in config
      if (this.config.showTime) {
        let dateObj = new Date(stop.departure_time * 1000);
        let timeStr = dateObj
          .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
          .toLowerCase();
        timeHTML += '<span class="time-small"> - ' + timeStr + "</span>";
      }

      departureTime.innerHTML = timeHTML;

      // Ensure both sides are vertically centered within the flex container
      routeInfo.style.alignItems = "center";

      routeInfo.appendChild(routeName);
      routeInfo.appendChild(departureTime);
      busTimeContainer.appendChild(routeInfo);
      busTimesContainer.appendChild(busTimeContainer);
      i++;
      j++;
    }

    container.appendChild(busTimesContainer);

    if (this.config.showlogo) {
      const transitlogoContainer = document.createElement("div");
      transitlogoContainer.style.display = "flex";
      transitlogoContainer.style.marginTop = "5px";
      transitlogoContainer.style.justifyContent = this.config.logoLocation; // Align to the right

      const transitlogo = document.createElement("img");
      transitlogo.src = "modules/MMM-PublicTransit/Images/transit-api-badge.png";
      transitlogo.alt = "Transit logo";
      transitlogo.style.height = this.config.logosize;
      transitlogo.style.objectFit = "contain";

      transitlogoContainer.appendChild(transitlogo);
      container.appendChild(transitlogoContainer);
    }

    return container;
  },

  activeHours() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    const startHour = this.config.activeHoursStart;
    const stopHour = this.config.activeHoursEnd;
    const activeDays = this.config.activeDays;

    if (startHour === undefined || stopHour === undefined || activeDays === undefined) return true; // If active hours or days are not defined, always show the module
    if (startHour <= currentHour && currentHour < stopHour && activeDays.includes(currentDay)) return true;
    return false;
  }
});

