"reach 0.1";

// create variables for hands and outcomw
const [isHand, ROCK, PAPER, SCISSORS] = makeEnum(3);
const [isOutcome, B_WINS, DRAW, A_WINS] = makeEnum(3);

// create function for winner
const winner = (handAlice, handBob) => (handAlice + (4 - handBob)) % 3;

// the expected outcomes
assert(winner(ROCK, PAPER) == B_WINS);
assert(winner(PAPER, ROCK) == A_WINS);
assert(winner(ROCK, ROCK) == DRAW);

forall(UInt, (handAlice) =>
  forall(UInt, (handBob) => assert(isOutcome(winner(handAlice, handBob))))
);

// says winner will always be draw
forall(UInt, (hand) => assert(winner(hand, hand) == DRAW));

// defining a player
const Player = {
  ...hasRandom, // <--- new!
  getHand: Fun([], UInt),
  seeOutcome: Fun([UInt], Null),
  informTimeout: Fun([], Null),
};

export const main = Reach.App(() => {
  const Alice = Participant("Alice", {
    ...Player,
    wager: UInt,
    deadline: UInt,
  });
  const Bob = Participant("Bob", {
    ...Player,
    acceptWager: Fun([UInt], Null),
  });
  init();

  const informTimeout = () => {
    each([Alice, Bob], () => {
      interact.informTimeout();
    });
  };

  Alice.only(() => {
    const wager = declassify(interact.wager);

    // choose a hand but not showing it
    const _handAlice = interact.getHand();

    // gives a password to be used in opening the hand when it is time
    const [_commitAlice, _saltAlice] = makeCommitment(interact, _handAlice);
    const commitAlice = declassify(_commitAlice);
    const deadline = declassify(interact.deadline);
  });
  Alice.publish(wager, commitAlice, deadline).pay(wager);
  commit();

  // telling the program that Bob cannot know Alice details
  unknowable(Bob, Alice(_handAlice, _saltAlice));

  Bob.only(() => {
    interact.acceptWager(wager);
    const handBob = declassify(interact.getHand());
  });

  Bob.publish(handBob)
    .pay(wager)
    .timeout(relativeTime(deadline), () => closeTo(Alice, informTimeout));
  commit();

  // time to reavel password and hand
  Alice.only(() => {
    const saltAlice = declassify(_saltAlice);
    const handAlice = declassify(_handAlice);
  });

  // make it public
  Alice.publish(saltAlice, handAlice).timeout(relativeTime(deadline), () =>
    closeTo(Bob, informTimeout)
  );

  // check if the details here matches what was created with makeCommitment
  checkCommitment(commitAlice, saltAlice, handAlice);

  // compute the result and show the winner
  const outcome = winner(handAlice, handBob);
  const [forAlice, forBob] =
    outcome == A_WINS
      ? [2, 0]
      : outcome == B_WINS
      ? [0, 2]
      : /* tie           */ [1, 1];
  transfer(forAlice * wager).to(Alice);
  transfer(forBob * wager).to(Bob);
  commit();

  each([Alice, Bob], () => {
    interact.seeOutcome(outcome);
  });
});
