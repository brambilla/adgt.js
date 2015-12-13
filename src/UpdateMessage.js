class UpdateMessage extends Message {

  constructor(sender) {
    super(sender, UpdateMessage.type());
  }
  
  static type() {
    return "UPDATE";
  }

}
