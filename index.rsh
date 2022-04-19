"reach 0.1";

// define the player functions
const Player = {
  getHand: Fun([], UInt),
  seeOutcome: Fun([UInt], Null),
};

export const main = Reach.App(() => {
  // define the those participating in the game/program
  const Alice = Participant("Alice", {
    ...Player,
    wager: UInt,
  });
  const Bob = Participant("Bob", {
    ...Player,
    acceptWager: Fun([UInt], Null),
  });

  // start the program/game
  init();

  // write your program here
  // Alice (the first participant) makes a decision as to which hand to show
  Alice.only(() => {
    const wager = declassify(interact.wager);

    // makes the hand available to be seen (public) by others in the network
    const handAlice = declassify(interact.getHand());
  });

  //   Alice actually shows the hand
  Alice.publish(wager, handAlice).pay(wager);
  //   Adds to the network
  commit();

  // Bob repeats what Alice did
  Bob.only(() => {
    interact.acceptWager(wager);

    // makes the hand available to be seen (public) by others in the network
    const handBob = declassify(interact.getHand());
  });
  Bob.publish(handBob).pay(wager);

  //   The program calculates the outcome of the game
  const outcome = (handAlice + (4 - handBob)) % 3;
  const [forAlice, forBob] =
    outcome == 2 ? [2, 0] : outcome == 0 ? [0, 2] : /* tie      */ [1, 1];
  transfer(forAlice * wager).to(Alice);
  transfer(forBob * wager).to(Bob);
  commit();

  //   send the outcome or result of each participant to the FE
  each([Alice, Bob], () => {
    interact.seeOutcome(outcome);
  });
});
