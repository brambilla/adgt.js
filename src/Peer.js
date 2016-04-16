class Peer {
	
	constructor(options) {
		this.descriptor = new Descriptor(Math.random().toString().replace('.', ''), Peer.mockPosition());
		this.bootstrappingNode = new BootstrappingNode(this, options.websocket);
		this.geobucket = new GeoBucket(Peer.mockPosition(), options.geobucket);
		this.options = options;
		this.listeners = new Map();
	}

  send(message) {
		this.geobucket.geocast(message);
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
		this.descriptor.position = position;
    if(this.geobucket.move(position)) {
			this.emit("neighbors", this.geobucket.descriptors());
		}
	}

	follows(position) {
		return this.geobucket.follows(position);
	}

	onmessage(message, node) {
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
							if(this.geobucket.update(remoteNode)) {
								this.emit("neighbors", this.geobucket.descriptors());
							}
						} else {
							remoteNode = new RemoteNode(this, descriptor, this.options.webrtc, this.bootstrappingNode, node);
							if(this.geobucket.add(remoteNode)) {
								remoteNode.connect();
								this.emit("neighbors", this.geobucket.descriptors());
							}
						}
					}
				}
				break;
				
			case UpdateMessage.type():
				node.update(message.sender);
				if(this.geobucket.update(node)) {
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
					var remoteNode = new RemoteNode(this, message.sender, this.options.webrtc, this.bootstrappingNode, node);
					if(!this.geobucket.has(remoteNode)) {
						var self = this;
						remoteNode.connection.setRemoteDescription(new RTCSessionDescription(message.offer));
						remoteNode.connection.createAnswer(function (answer) {
							remoteNode.connection.setLocalDescription(new RTCSessionDescription(answer), function() {
								remoteNode.sendToSignalingNode(new SignalingMessage(self.descriptor, message.sender, new AnswerMessage(self.descriptor, answer)));
							}, function (error) {
								self.emit("error", error);
							});
						}, function (error) {
							self.emit("error", error);
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
    }, 60000);
	}

	disconnect() {
		this.geobucket.removeAll();
		if(this.bootstrappingNode.isConnected()) {
			this.bootstrappingNode.disconnect();
		}
	}

	task() {
	  if(this.bootstrappingNode.isConnected()) {
			
			if(this.geobucket.size() < this.options.geobucket.lower_limit) {
				this.bootstrappingNode.send(new DiscoveryRequestMessage(this.descriptor));
			}
			
			var nodes = this.geobucket.retrieve(this.descriptor.position, this.options.discovery.request_limit);
			var message = new DiscoveryRequestMessage(this.descriptor);
			for(var node of nodes) {
				if(node.isConnected()) {
					node.send(message);
				}
			}
		}
	}

	static mockPosition() {
		    var latitude = 44.76487;
		    var longitude = 10.30836;
		    var heading = Math.random() * 360.0;
		    var distance = Math.random() * 20000;
		    
		    var destination = Geography.destination(latitude, longitude, heading, distance);
		    return {"coords":{"accuracy":0.0,"altitude":0.0,"altitudeAccuracy":0.0,"heading":destination.heading,"latitude":destination.latitude,"longitude":destination.longitude,"speed":0.0},"timestamp":Date.now()};
	}
}
