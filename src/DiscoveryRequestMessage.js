class DiscoveryRequestMessage extends Message {

  constructor(sender) {
    super(sender, DiscoveryRequestMessage.type());
  }
  
  static type() {
    return "DISCOVERY_REQUEST";
  }

}
