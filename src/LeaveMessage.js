class LeaveMessage extends Message {

  constructor(sender) {
    super(sender, LeaveMessage.type());
  }
  
  static type() {
    return "LEAVE";
  }

}
