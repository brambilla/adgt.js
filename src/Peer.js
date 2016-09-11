class Peer {

    constructor(options) {
        var position = Geography.mockPosition();
        this.descriptor = new Descriptor(Math.random().toString().replace('.', ''), position);
        this.bootstrappingNode = new BootstrappingNode(this, options.websocket);
        this.geobucket = new GeoBucket(position, options.geobucket);
        this.options = options;
        this.listeners = new Map();
    }

    geocast(message) {
        this.geobucket.geocast(message);
    }
    
    send(message, descriptor) {
        this.geobucket.send(message, descriptor);
    }

    on(event, callback) {
        if(this.listeners.has(event)) {
            this.listeners.get(event).add(callback);
        } else {
            var callbacks = new Set();
            callbacks.add(callback);
            this.listeners.set(event, callbacks);
        }
    }

    emit(event, data) {
        if(this.listeners.has(event)) {
            for(var callback of this.listeners.get(event)) {
                callback(data);
            }
        }
    }

    move(position) {
        var p = {coords: {latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, altitude: position.coords.altitude, altitudeAccuracy: position.coords.altitudeAccuracy, heading: position.coords.heading, speed: position.coords.speed}, timestamp: position.timestamp};
        this.descriptor.position = p;
        if(this.geobucket.move(p)) {
            this.emit("neighbors", this.geobucket.descriptors());
        }
    }

    follows(position) {
        return this.geobucket.follows(position);
    }

    onmessage(message, node) {
        if(message.sender) {
            console.log('Received ' + message.type + ' from ' + message.sender.key);
        } else {
            console.log('Received ' + message.type + ' from Bootstrapping Node');
        }
        switch(message.type) {
            case DiscoveryRequestMessage.type():
                var descriptors = [];
                for(var n of this.geobucket.retrieve(message.sender.position, this.options.discovery.response_limit)) {
                    descriptors.push(n.descriptor);
                }
                node.send(new DiscoveryResponseMessage(this.descriptor, descriptors));
                break;

            case DiscoveryResponseMessage.type():
                for(var index in message.descriptors) {
                    var descriptor = message.descriptors[index];
                    if(this.descriptor.key !== descriptor.key && this.follows(descriptor.position)) {
                        var remoteNode = this.geobucket.get(descriptor);
                        if(remoteNode) {
                            if(this.geobucket.update(descriptor)) {
                                remoteNode.setSignalingNode(node);
                                this.emit("neighbors", this.geobucket.descriptors());
                            }
                        } else {
                            remoteNode = new RemoteNode(this, descriptor, this.options.webrtc, this.bootstrappingNode, node, true);
                            if(this.geobucket.add(remoteNode)) {
                                remoteNode.connect();
                                this.emit("neighbors", this.geobucket.descriptors());
                            }
                        }
                    }
                }
                break;

            case UpdateMessage.type():
                if(this.geobucket.update(message.sender)) {
                    this.emit("neighbors", this.geobucket.descriptors());
                }
                break;

            case DataMessage.type():
                this.emit("data", message.data);
                break;

            case LeaveMessage.type():
                var node = this.geobucket.get(message.sender);
                if(node !== null) {
                    if(this.geobucket.remove(node)) {
                        this.emit("neighbors", this.geobucket.descriptors());
                    }
                }
                break;

            case AnswerMessage.type():
                var node = this.geobucket.get(message.sender);
                if(node !== null) {
                    node.connection.setRemoteDescription(new RTCSessionDescription(message.answer));
                }
                break;

            case OfferMessage.type():
                if(this.follows(message.sender.position)) {
                    var remoteNode = new RemoteNode(this, message.sender, this.options.webrtc, this.bootstrappingNode, node, false);
                    if(!this.geobucket.has(remoteNode)) {
                        var self = this;
                        remoteNode.connection.setRemoteDescription(new RTCSessionDescription(message.offer));

                        remoteNode.connection.createAnswer().then(function(answer) {
                            return remoteNode.connection.setLocalDescription(answer);
                        }).then(function() {
                            remoteNode.sendToSignalingNode(new SignalingMessage(self.descriptor, message.sender, new AnswerMessage(self.descriptor, remoteNode.connection.localDescription)));
                        }).catch(function(reason) {
                            // An error occurred, so handle the failure to connect
                        });

                        if(this.geobucket.add(remoteNode)) {
                            this.emit("neighbors", this.geobucket.descriptors());
                        }
                    }
                }
                break;

            case CandidateMessage.type():
                var node = this.geobucket.get(message.sender);
                if(node !== null) {
                    node.connection.addIceCandidate(new RTCIceCandidate(message.candidate));
                }
                break;

            case SignalingMessage.type():
                var node = this.geobucket.get(message.recipient);
                if(node != null) {
                    node.send(message.payload);
                }
                break;
        }
    }

    connect() {
        this.bootstrappingNode.connect();

        var self = this;
        setInterval(function() {
            self.task();
        }, this.options.discovery.period);
    }

    disconnect() {
        this.geobucket.removeAll();
        if(this.bootstrappingNode.isConnected()) {
            this.bootstrappingNode.disconnect();
        }
    }

    task() {
        console.log('-------------------- ' + this.descriptor.key + ' --------------------');
        console.log('Neighbors: [' + this.geobucket.descriptors().map(function(descriptor){return descriptor.key}).join(', ') + ']');
        if(this.bootstrappingNode.isConnected()) {
            if(this.geobucket.size() < this.options.geobucket.lower_limit) {
                this.bootstrappingNode.send(new DiscoveryRequestMessage(this.descriptor));
            }

            var nodes = this.geobucket.retrieve(this.descriptor.position, this.options.discovery.request_limit);
            var message = new DiscoveryRequestMessage(this.descriptor);
            for(var node of nodes) {
                node.send(message);
            }
        }
    }

}
