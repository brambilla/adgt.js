class RemoteNode {

    constructor(peer, descriptor, options, bootstrappingNode, signalingNode, isCalled) {
        this.peer = peer;
        this.descriptor = descriptor;
        this.options = options;
        this.bootstrappingNode = bootstrappingNode;
        this.signalingNode = signalingNode;
        this.pendingMessages = new Set();

        var self = this;
        this.connection = new RTCPeerConnection(options.configuration);

        this.connection.onicecandidate = function (event) {
            if(event.candidate) {
                self.sendToSignalingNode(new SignalingMessage(self.peer.descriptor, self.descriptor, new CandidateMessage(self.peer.descriptor, event.candidate)));
            }
        };

        this.connection.ondatachannel = function(event) {
            self.datachannel = event.channel;

            self.datachannel.onmessage = function(event) {
                self.peer.onmessage(JSON.parse(event.data), self);
            };

            self.datachannel.onclose = function (event) {
                self.peer.geobucket.remove(self);
                self.peer.emit("neighbors", self.peer.geobucket.descriptors());
            };
            
            self.datachannel.onopen = function (event) {
                self.pendingMessages.forEach(function(message) {
                    self.datachannel.send(JSON.stringify(message));
                    console.log('Sent ' + message.type + ' to ' + self.descriptor.key);
                });
                self.pendingMessages.clear();
            };
        };

        if(isCalled) {
            this.datachannel = this.connection.createDataChannel(options.label, options.datachannel_options);

            this.datachannel.onmessage = function(event) {
                self.peer.onmessage(JSON.parse(event.data), self);
            };

            this.datachannel.onclose = function (event) {
                self.peer.geobucket.remove(self);
                self.peer.emit("neighbors", self.peer.geobucket.descriptors());
            };
            
            this.datachannel.onopen = function (event) {
                self.pendingMessages.forEach(function(message) {
                    self.datachannel.send(JSON.stringify(message));
                    console.log('Sent ' + message.type + ' to ' + self.descriptor.key);
                });
                self.pendingMessages.clear();
            };
        }
    }

    isConnected() {
        return (this.datachannel && ("open" === this.datachannel.readyState));
    }

    connect() {
        var self = this;

        this.connection.createOffer().then(function(offer) {
            return self.connection.setLocalDescription(offer);
        }).then(function() {
            self.sendToSignalingNode(new SignalingMessage(self.peer.descriptor, self.descriptor, new OfferMessage(self.peer.descriptor, self.connection.localDescription)));
        }).catch(function(reason) {
            // An error occurred, so handle the failure to connect
        });
    }

    send(message) {
        if(this.isConnected()) {
            this.datachannel.send(JSON.stringify(message));
            console.log('Sent ' + message.type + ' to ' + this.descriptor.key);
        } else {
            this.pendingMessages.add(message);
        }
    }

    sendToSignalingNode(message) {
        if(this.signalingNode.isConnected()) {
            this.signalingNode.send(message);
        } else {
            this.bootstrappingNode.send(message);
        }
    }

    disconnect() {
        if(this.isConnected()) {
            this.sendToSignalingNode(new SignalingMessage(this.peer.descriptor, this.descriptor, new LeaveMessage(this.peer.descriptor)));
            this.datachannel.close();
            this.connection.close();
            this.connection.onicecandidate = null;
        }
    }

    setSignalingNode(signalingNode) {
        this.signalingNode = signalingNode;
    }

}
