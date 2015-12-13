class OfferMessage extends Message {

  constructor(sender, offer) {
    super(sender, OfferMessage.type());
    this.offer = offer;
  }
  
  static type() {
    return "OFFER";
  }

}
