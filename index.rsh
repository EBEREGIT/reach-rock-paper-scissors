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

  // function to notify about time out
  const informTimeout = () => {
    each([Alice, Bob], () => {
      interact.informTimeout();
    });
  };

  Alice.only(() => {
    const wager = declassify(interact.wager);

    const deadline = declassify(interact.deadline);
  });
  Alice.publish(wager, deadline).pay(wager);
  commit();

  Bob.only(() => {
    interact.acceptWager(wager);
  });

  // make public and invokes time out
  Bob.pay(wager).timeout(relativeTime(deadline), () =>
    closeTo(Alice, informTimeout)
  );

  // definig the outcome with a default value
  var outcome = DRAW;
  invariant(balance() == 2 * wager && isOutcome(outcome));
  while (outcome == DRAW) {
    commit();

    // Alice local step
    Alice.only(() => {
      // choose a hand but not showing it
      const _handAlice = interact.getHand();

      // gives a password to be used in opening the hand when it is time
      const [_commitAlice, _saltAlice] = makeCommitment(interact, _handAlice);
      const commitAlice = declassify(_commitAlice);
    });
    Alice.publish(commitAlice).timeout(relativeTime(deadline), () =>
      closeTo(Bob, informTimeout)
    );
    commit();

    // telling the program that Bob cannot know Alice details
    unknowable(Bob, Alice(_handAlice, _saltAlice));

    Bob.only(() => {
      const handBob = declassify(interact.getHand());
    });
    Bob.publish(handBob).timeout(relativeTime(deadline), () =>
      closeTo(Alice, informTimeout)
    );
    commit();

    Alice.only(() => {
      const saltAlice = declassify(_saltAlice);
      const handAlice = declassify(_handAlice);
    });

    Alice.publish(saltAlice, handAlice).timeout(relativeTime(deadline), () =>
      closeTo(Bob, informTimeout)
    );
    checkCommitment(commitAlice, saltAlice, handAlice);

    outcome = winner(handAlice, handBob);
    continue;
  }

  // since the outcome can never be a draw, we remove DRAW outcome possibility
  assert(outcome == A_WINS || outcome == B_WINS);
  transfer(2 * wager).to(outcome == A_WINS ? Alice : Bob);
  commit();
});
