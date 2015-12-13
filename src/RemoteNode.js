class RemoteNode {
	
	constructor(peer, descriptor, options, bootstrappingNode, signalingNode) {
		this.peer = peer;
		this.descriptor = descriptor;
		this.options = options;
		this.bootstrappingNode = bootstrappingNode;
		this.signalingNode = signalingNode;
		
		var self = this;
		
		this.connection = new RTCPeerConnection(options.configuration);
		this.datachannel = this.connection.createDataChannel(options.label, options.dataChannelDict);

		this.connection.ondatachannel = function(event) {
			event.channel.onmessage = function(event) {
				self.peer.onmessage(JSON.parse(event.data), self);
			};
				
			event.channel.onopen = function (event) {
				self.peer.emit("open", event);
			};
			
			event.channel.onclose = function (event) {
				self.peer.geobucket.remove(self);
				self.peer.emit("close", event);
			};
			
			event.channel.onerror = function (error) {
				self.peer.emit("error", event);
			};
		};
		
		this.connection.onicecandidate = function (event) {
			if (event.candidate) {
				self.sendToSignalingNode(new SignalingMessage(self.peer.descriptor, self.descriptor, new CandidateMessage(self.peer.descriptor, event.candidate)));
			}
		};
	}
	
	isConnected() {
		return this.datachannel.readyState === "open";
	}

	connect() {
		var self = this;
		this.connection.createOffer(function (offer) {
			self.connection.setLocalDescription(new RTCSessionDescription(offer), function() {
				self.sendToSignalingNode(new SignalingMessage(self.peer.descriptor, self.descriptor, new OfferMessage(self.peer.descriptor, offer)));
			}, function (error) {
				self.peer.emit("error", error);
			});
		}, function (error) {
			self.peer.emit("error", error);
		});
	}

	send(message) {
		this.datachannel.send(JSON.stringify(message));
	}

	update(descriptor) {
		this.descriptor = descriptor;
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

}