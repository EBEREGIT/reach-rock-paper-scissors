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
  });
  const Bob = Participant("Bob", {
    ...Player,
  });

  //   start the program/game
  init();

  // write your program here
  // Alice (the first participant) makes a decision as to which hand to show
  Alice.only(() => {
    // makes the hand available to be seen (public) by others in the network
    const handAlice = declassify(interact.getHand());
  });

  //   Alice actually shows the hand
  Alice.publish(handAlice);
  //   Adds to the network
  commit();

  // Bob repeats what Alice did
  Bob.only(() => {
    const handBob = declassify(interact.getHand());
  });
  Bob.publish(handBob);

  //   The program calculates the outcome of the game
  const outcome = (handAlice + (4 - handBob)) % 3;
  commit();

//   send the outcome or result of each participant to the FE
  each([Alice, Bob], () => {
    interact.seeOutcome(outcome);
  });
});
