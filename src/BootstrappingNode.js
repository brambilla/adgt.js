class BootstrappingNode {

    constructor(peer, options) {
        this.peer = peer;
        this.options = options;
    }
  
    connect() {
        var self = this;

        this.websocket = new WebSocket(this.options.url, this.options.protocols);
        this.websocket.onopen = function (event) {
            self.send(new DiscoveryRequestMessage(self.peer.descriptor));
        };

        this.websocket.onmessage = function (event) {
            self.peer.onmessage(JSON.parse(event.data), self);
        };

        this.websocket.onclose = function(event) {
            self.peer.disconnect();
        };
    }

    disconnect() {
        this.websocket.close();
    }

    send(message) {
        if(this.isConnected()) {
            this.websocket.send(JSON.stringify(message));
        }
    }

    isConnected() {
        return this.websocket.readyState === WebSocket.OPEN;
    }

}
