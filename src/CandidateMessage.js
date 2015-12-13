class CandidateMessage extends Message {

  constructor(sender, candidate) {
    super(sender, CandidateMessage.type());
    this.candidate = candidate;
  }
  
  static type() {
    return "CANDIDATE";
  }

}
