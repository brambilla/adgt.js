class DataMessage extends Message {

  constructor(sender, position, data) {
    super(sender, DataMessage.type());
    this.position = position;
    this.data = data;
  }
  
  static type() {
    return "DATA";
  }

}
