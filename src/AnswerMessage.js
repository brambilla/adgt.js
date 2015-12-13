class AnswerMessage extends Message {

  constructor(sender, answer) {
    super(sender, AnswerMessage.type());
    this.answer = answer;
  }
  
  static type() {
    return "ANSWER";
  }

}
