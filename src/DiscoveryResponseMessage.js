class DiscoveryResponseMessage extends Message {

  constructor(sender, descriptors) {
    super(sender, DiscoveryResponseMessage.type());
    this.descriptors = descriptors;
  }
  
  static type() {
    return "DISCOVERY_RESPONSE";
  }

}
