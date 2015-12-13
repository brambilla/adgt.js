class SignalingMessage extends Message {

  constructor(sender, recipient, payload) {
    super(sender, SignalingMessage.type());
		this.recipient = recipient;
    this.payload = payload;
  }
  
  static type() {
    return "SIGNALING";
  }

}
