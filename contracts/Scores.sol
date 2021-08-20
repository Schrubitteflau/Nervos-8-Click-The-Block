pragma solidity >=0.8.0;

contract Scores {

  Score[] public scores;
  
  // Usernames per address
  mapping(address => string) public usernames;

  // Each Score is represented by an user, the score and a timestamp
  struct Score {
    address user;
    uint score;
    uint time;
  }
  
  // Used as return type of getLatestScores()
  struct ScoreWithUsername {
    address user;
    uint score;
    uint time;
    string username;
  }
  
  // Add a score
  function addScore(uint _score) public {
      require(_score > 0, "Score must be > 0");
      
      Score memory score = Score({
          user: msg.sender,
          score: _score,
          time: block.timestamp
      });
      scores.push(score);
  }
  
  // Attach a username to an address
  function setUsername(string memory _username) public {
      require(bytes(_username).length >= 3 && bytes(_username).length <= 10, "Username must be between 3 and 10 characters");

      usernames[msg.sender] = _username;
  }
  
  // Get the number of stored scores
  function scoresCount() external view returns(uint) {
      return scores.length;
  }
  
  // Get the _count latest scores
  function getLatestScores(uint _count) public view returns (ScoreWithUsername[] memory) {
      require(_count > 0, "Count must be > 0");

      uint scoresLength = scores.length;
      // _count max value is scoresLength
      uint count = (_count > scoresLength ? scoresLength : _count);
      // Return array
      ScoreWithUsername[] memory latestScores = new ScoreWithUsername[](count);
      
      for (uint i = 0; i < count; i++)
      {
          // Pointer to the stored score
          Score storage score = scores[scoresLength - i - 1];
          // Username (optional) of the user
          string memory username = usernames[score.user];
          // New struct with username
          ScoreWithUsername memory scoreWithUsername = ScoreWithUsername({
              user: score.user,
              score: score.score,
              time: score.time,
              username: username
          });
          // Append it to the return array
          latestScores[i] = scoreWithUsername;
      }
      
      return latestScores;
  }
}