class Geography {
  
    constructor() {
    }

    /** Earth radius in metres **/
    static EARTH_RADIUS() {
        return 6370986.0;
    }

    /** Calculate the great-circle distance in metres between two coordinates using the haversine formula **/
    static distance(latitude1, longitude1, latitude2, longitude2) {
        const deltaLatitude = latitude1 - latitude2;
        const deltaLongitude = longitude1 - longitude2;
        const a = Math.sin((deltaLatitude * Math.PI / 180)/2) * Math.sin((deltaLatitude * Math.PI / 180)/2) + Math.sin((deltaLongitude * Math.PI / 180)/2) * Math.sin((deltaLongitude * Math.PI / 180)/2) * Math.cos(latitude1 * Math.PI / 180) * Math.cos(latitude2 * Math.PI / 180);
        return 2 * Geography.EARTH_RADIUS() * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    /** Calculate the destination coordinates given start coordinates, initial heading in degree, and distance in metres **/
    static destination(latitude, longitude, heading, distance) {
        if(distance === 0) {
            return coordinates;
        } else {
            const latitude2 = (Math.asin(Math.sin(latitude * Math.PI / 180)*Math.cos(distance/Geography.EARTH_RADIUS()) + Math.cos(latitude * Math.PI / 180)*Math.sin(distance/Geography.EARTH_RADIUS())*Math.cos(heading * Math.PI / 180))) * 180 / Math.PI;
            const longitude2 = longitude + (Math.atan2(Math.sin(heading * Math.PI / 180) * Math.sin(distance/Geography.EARTH_RADIUS()) * Math.cos(latitude * Math.PI / 180), Math.cos(distance/Geography.EARTH_RADIUS()) - Math.sin(latitude * Math.PI / 180) * Math.sin(latitude2 * Math.PI / 180))) * 180 / Math.PI;
            return {
                "latitude": latitude2,
                "longitude": longitude2,
                "heading": (Geography.heading(latitude2, longitude2, latitude, longitude) + 180) % 360
            };
        }
    }

    /** Calculate the initial heading given the start coordinates to the end coordinates **/
    static heading(latitude1, longitude1, latitude2, longitude2) {
        const y = Math.sin(longitude2 * Math.PI / 180 - longitude1 * Math.PI / 180) * Math.cos(latitude2 * Math.PI / 180);
        const x = Math.cos(latitude1 * Math.PI / 180)*Math.sin(latitude2 * Math.PI / 180) - Math.sin(latitude1 * Math.PI / 180)*Math.cos(latitude2 * Math.PI / 180)*Math.cos(longitude2 * Math.PI / 180 - longitude1 * Math.PI / 180);
        return (Math.atan2(y, x) * 180.0 / Math.PI + 360) % 360;
    }

    /** Return a mock position **/
    static mockPosition() {
        var latitude = 44.76487;
        var longitude = 10.30836;
        var heading = Math.random() * 360.0;
        var distance = Math.random() * 20000;

        var destination = Geography.destination(latitude, longitude, heading, distance);
        return {"coords":{"accuracy":0.0,"altitude":0.0,"altitudeAccuracy":0.0,"heading":destination.heading,"latitude":destination.latitude,"longitude":destination.longitude,"speed":0.0},"timestamp":Date.now()};
    };

}
